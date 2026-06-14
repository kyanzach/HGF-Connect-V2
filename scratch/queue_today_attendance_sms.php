<?php
/**
 * HGF Connect — Queue Today's Attendance SMS Backfill
 * Identifies all attendees of today's service (event ID 65) who have phone numbers,
 * generates the correct personalized SMS message based on member type/ministry involvement,
 * and inserts them into the custom_sms_batches queue.
 * 
 * Usage:
 *   php scratch/queue_today_attendance_sms.php --dry-run
 *   php scratch/queue_today_attendance_sms.php --commit
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

$dryRun = true;
if (isset($argv[1])) {
    if ($argv[1] === '--commit') {
        $dryRun = false;
    } elseif ($argv[1] === '--dry-run') {
        $dryRun = true;
    } else {
        echo "Usage: php scratch/queue_today_attendance_sms.php [--dry-run|--commit]\n";
        exit(1);
    }
} else {
    echo "⚠️ No mode specified. Defaulting to safe --dry-run mode.\n";
}

echo "==================================================\n";
echo "   HGF CONNECT — QUEUE ATTENDANCE SMS BACKFILL\n";
echo "   Mode: " . ($dryRun ? "DRY-RUN (No writes will be saved)" : "COMMIT (CHANGES WILL BE PERMANENT)") . "\n";
echo "   Time: " . date('Y-m-%d %H:%M:%S') . "\n";
echo "==================================================\n\n";

// Helper: load .env file
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            list($name, $value) = $parts;
            $name = trim($name);
            $value = trim($value);
            if (preg_match('/^"(.*)"$/', $value, $matches)) {
                $value = $matches[1];
            } elseif (preg_match("/^'(.*)'$/", $value, $matches)) {
                $value = $matches[1];
            }
            $_ENV[$name] = $value;
            putenv("$name=$value");
        }
    }
    return true;
}

$envPath = __DIR__ . '/../.env';
if (!loadEnv($envPath)) {
    loadEnv('.env');
}

$dbUrl = isset($_ENV['DATABASE_URL']) ? $_ENV['DATABASE_URL'] : getenv('DATABASE_URL');
$host = 'localhost';
$port = 3306;
$user = 'root';
$pass = '';
$dbname = 'hog_fellowship';

if ($dbUrl) {
    $parsed = parse_url($dbUrl);
    if ($parsed && isset($parsed['scheme']) && $parsed['scheme'] === 'mysql') {
        $host = isset($parsed['host']) ? $parsed['host'] : $host;
        $port = isset($parsed['port']) ? $parsed['port'] : $port;
        $user = isset($parsed['user']) ? $parsed['user'] : $user;
        $pass = isset($parsed['pass']) ? rawurldecode($parsed['pass']) : $pass;
        $dbname = isset($parsed['path']) ? ltrim($parsed['path'], '/') : $dbname;
    }
}

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
    echo "✅ Database connection established.\n\n";
} catch (PDOException $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

$eventId = 65; // Today's Sunday Service and Ordination Ceremony

// Fetch event details
$eventStmt = $pdo->prepare("SELECT title FROM events WHERE id = :event_id");
$eventStmt->execute(['event_id' => $eventId]);
$event = $eventStmt->fetch();
if (!$event) {
    echo "❌ Event ID {$eventId} not found.\n";
    exit(1);
}
$eventTitle = $event['title'];
echo "Target Event: \"{$eventTitle}\" (ID {$eventId})\n\n";

// Fetch today's attendance records with member details
$attendanceStmt = $pdo->prepare("
    SELECT ar.id as attendance_id, ar.is_first_visit, m.id as member_id, m.first_name, m.last_name, m.phone
    FROM attendance_records ar
    JOIN members m ON ar.member_id = m.id
    WHERE ar.event_id = :event_id
      AND m.phone IS NOT NULL AND m.phone != ''
    ORDER BY m.last_name, m.first_name
");
$attendanceStmt->execute(['event_id' => $eventId]);
$attendees = $attendanceStmt->fetchAll();

echo "Found " . count($attendees) . " attendees with phone numbers.\n\n";

if (count($attendees) === 0) {
    echo "No SMS messages to queue.\n";
    exit(0);
}

// Start transaction
$pdo->beginTransaction();

try {
    // Create new batch for this backfill
    $batchStmt = $pdo->prepare("
        INSERT INTO custom_sms_batches (source, status, priority, created_by, created_at, updated_at)
        VALUES ('attendance', 'pending', 'normal', 2, NOW(), NOW())
    ");
    $batchStmt->execute();
    $batchId = $pdo->lastInsertId();
    echo "Creating Batch ID: {$batchId}\n\n";

    $queuedCount = 0;
    
    foreach ($attendees as $attendee) {
        $memberId = $attendee['member_id'];
        $memberName = $attendee['first_name'] . ' ' . $attendee['last_name'];
        $phone = $attendee['phone'];
        $isFirstVisit = (bool)$attendee['is_first_visit'];

        // Determine ministry involvement
        $ministryStmt = $pdo->prepare("
            SELECT m.name as ministry_name
            FROM member_ministries mm
            JOIN ministries m ON mm.ministry_id = m.id
            WHERE mm.member_id = :member_id AND mm.status = 'active'
        ");
        $ministryStmt->execute(['member_id' => $memberId]);
        $ministries = $ministryStmt->fetchAll(PDO::FETCH_COLUMN);

        $isPastor = false;
        $hasMinistry = false;
        $ministryName = '';
        
        if (count($ministries) > 0) {
            $hasMinistry = true;
            foreach ($ministries as $minName) {
                if (strtolower($minName) === 'pastoral') {
                    $isPastor = true;
                    $ministryName = 'Pastoral';
                }
            }
            if (!$isPastor) {
                if (count($ministries) === 1) {
                    $ministryName = $ministries[0];
                } else {
                    $minCount = count($ministries);
                    if ($minCount <= 3) {
                        $ministryName = implode(', ', $ministries);
                    } else {
                        $ministryName = $ministries[0] . ', ' . $ministries[1] . ' and ' . ($minCount - 2) . ' more';
                    }
                }
            }
        }

        // Compose SMS message
        if ($isFirstVisit) {
            $message = "Welcome to House of Grace Fellowship, {$attendee['first_name']}! 🙌\n\nThank you for joining us today for {$eventTitle}. Your attendance has been recorded.\n\nWe're blessed to have you with us. God bless!\n\n— Your HGF Family";
        } elseif ($isPastor) {
            $message = "The Pastor is in! 🙏\n\nHello Pastor {$attendee['first_name']}!\n\nYour attendance for {$eventTitle} has been recorded. The flock is blessed by your presence today.\n\nMay your words inspire many hearts!\n\n— Your HGF Family";
        } elseif ($hasMinistry) {
            $message = "Hello {$attendee['first_name']}! 🌟\n\nThank you for your faithful service in the {$ministryName} ministry.\n\nYour attendance for {$eventTitle} has been recorded.\n\nYour dedication to serving is truly appreciated!\n\n— Your HGF Family";
        } else {
            $message = "Hello {$attendee['first_name']}! ✨\n\nYour attendance for {$eventTitle} has been recorded.\n\nThank you for being part of our fellowship. God bless!\n\n— Your HGF Family";
        }

        // Output preview of the first few
        if ($queuedCount < 3) {
            echo "--------------------------------------------------\n";
            echo "Recipient: {$memberName} ({$phone})\n";
            echo "Type: " . ($isFirstVisit ? 'First Visit' : ($isPastor ? 'Pastor' : ($hasMinistry ? 'Ministry: ' . $ministryName : 'Member'))) . "\n";
            echo "Message:\n{$message}\n";
        } elseif ($queuedCount === 3) {
            echo "--------------------------------------------------\n";
            echo "... and " . (count($attendees) - 3) . " more recipients ...\n";
            echo "--------------------------------------------------\n\n";
        }

        // Queue in batch
        $recipientStmt = $pdo->prepare("
            INSERT INTO custom_sms_batch_recipients (batch_id, member_id, phone_number, personalized_message, send_status, created_at)
            VALUES (:batch_id, :member_id, :phone_number, :personalized_message, 'pending', NOW())
        ");
        $recipientStmt->execute([
            'batch_id' => $batchId,
            'member_id' => $memberId,
            'phone_number' => $phone,
            'personalized_message' => $message
        ]);

        $queuedCount++;
    }

    echo "Total SMS Messages Queued: {$queuedCount}\n\n";

    if ($dryRun) {
        $pdo->rollBack();
        echo "==================================================\n";
        echo "   DRY-RUN COMPLETE: TRANSACTION ROLLED BACK SUCCESS\n";
        echo "   No rows were actually saved.\n";
        echo "==================================================\n";
    } else {
        $pdo->commit();
        echo "==================================================\n";
        echo "   COMMIT COMPLETE: SMS BATCH QUEUED SUCCESSFULLY\n";
        echo "   Batch ID {$batchId} is now pending in the database.\n";
        echo "==================================================\n";
    }

} catch (Exception $e) {
    $pdo->rollBack();
    echo "❌ FAILED: " . $e->getMessage() . "\n";
    exit(1);
}
