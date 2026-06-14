<?php
/**
 * HGF Connect — Duplicate Member Merge Script
 * Securely merges 12 duplicate member groups in the hog_fellowship database.
 * 
 * Usage:
 *   php scratch/merge_duplicates.php --dry-run
 *   php scratch/merge_duplicates.php --commit
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// ── Parse arguments ──
$dryRun = true;
if (isset($argv[1])) {
    if ($argv[1] === '--commit') {
        $dryRun = false;
    } elseif ($argv[1] === '--dry-run') {
        $dryRun = true;
    } else {
        echo "Usage: php scratch/merge_duplicates.php [--dry-run|--commit]\n";
        exit(1);
    }
} else {
    echo "⚠️ No mode specified. Defaulting to safe --dry-run mode.\n";
}

echo "==================================================\n";
echo "   HGF CONNECT — DUPLICATE MEMBER MERGE SCRIPT\n";
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
            // Remove surrounding quotes
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

// Locate project root to read .env
$envPath = __DIR__ . '/../.env';
if (!loadEnv($envPath)) {
    // Try current directory fallback
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

echo "→ Connecting to database: {$dbname} on {$host}:{$port} as user '{$user}'...\n";
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

// ── Duplicate Groups Definition ──
$groups = [
    [
        'name' => 'Nizel Plazo',
        'survivor_id' => 26,
        'duplicate_id' => 239,
        'force_overwrites' => []
    ],
    [
        'name' => 'Rechelle Buro',
        'survivor_id' => 37,
        'duplicate_id' => 129,
        'force_overwrites' => []
    ],
    [
        'name' => 'Caerwyn Enriquez',
        'survivor_id' => 79,
        'duplicate_id' => 370,
        'force_overwrites' => [
            'age_group' => 'Youth'
        ]
    ],
    [
        'name' => 'Marvie Joy Rebojo',
        'survivor_id' => 145,
        'duplicate_id' => 147,
        'force_overwrites' => []
    ],
    [
        'name' => 'JL Maturan',
        'survivor_id' => 158,
        'duplicate_id' => 369,
        'force_overwrites' => [
            'type' => 'Growing Friend'
        ]
    ],
    [
        'name' => 'Dina Tuzon',
        'survivor_id' => 160,
        'duplicate_id' => 235,
        'force_overwrites' => []
    ],
    [
        'name' => 'Jevie Aguan',
        'survivor_id' => 183,
        'duplicate_id' => 244,
        'force_overwrites' => []
    ],
    [
        'name' => 'Angelu Enghog',
        'survivor_id' => 222,
        'duplicate_id' => 240,
        'force_overwrites' => []
    ],
    [
        'name' => 'Rodisa Rama',
        'survivor_id' => 229,
        'duplicate_id' => 237,
        'force_overwrites' => []
    ],
    [
        'name' => 'Vanessa Tuzon',
        'survivor_id' => 230,
        'duplicate_id' => 234,
        'force_overwrites' => []
    ],
    [
        'name' => 'Marie Kris Paco',
        'survivor_id' => 238,
        'duplicate_id' => 242,
        'force_overwrites' => []
    ],
    [
        'name' => 'Lyle Embalzado',
        'survivor_id' => 250,
        'duplicate_id' => 372,
        'force_overwrites' => [
            'type' => 'Family Member'
        ]
    ]
];

$copyable_columns = [
    'email', 'profile_picture', 'profile_picture_thumbnail', 'cover_photo', 'phone', 
    'address', 'birthdate', 'join_date', 'baptism_date', 'family_members', 
    'ministry_involvement', 'favorite_verse', 'invited_by', 'age_group', 'type', 
    'username', 'password', 'role', 'last_login', 'show_email', 'show_phone', 
    'show_address', 'cover_photo_position_x', 'cover_photo_position_y', 
    'sms_5day_reminder', 'sms_3day_reminder', 'sms_1day_reminder', 
    'sms_same_day_reminder', 'webauthn_challenge', 'is_verified', 'gcash_name', 'gcash_mobile'
];

$relation_updates = [
    ['table' => 'events', 'column' => 'created_by'],
    ['table' => 'attendance_records', 'column' => 'member_id'],
    ['table' => 'attendance_records', 'column' => 'recorded_by'],
    ['table' => 'member_ministries', 'column' => 'member_id'],
    ['table' => 'member_ministries', 'column' => 'approved_by'],
    ['table' => 'member_photo_history', 'column' => 'member_id'],
    ['table' => 'member_status_history', 'column' => 'member_id'],
    ['table' => 'member_status_history', 'column' => 'changed_by'],
    ['table' => 'sms_logs', 'column' => 'member_id'],
    ['table' => 'app_logs', 'column' => 'performed_by_id'],
    ['table' => 'marketplace_listings', 'column' => 'member_id'],
    ['table' => 'marketplace_messages', 'column' => 'sender_id'],
    ['table' => 'marketplace_messages', 'column' => 'receiver_id'],
    ['table' => 'marketplace_reports', 'column' => 'reported_by'],
    ['table' => 'marketplace_reports', 'column' => 'reviewed_by'],
    ['table' => 'listing_shares', 'column' => 'sharer_id'],
    ['table' => 'posts', 'column' => 'author_id'],
    ['table' => 'post_comments', 'column' => 'author_id'],
    ['table' => 'prayer_requests', 'column' => 'author_id'],
    ['table' => 'prayer_responses', 'column' => 'author_id'],
    ['table' => 'journal_entries', 'column' => 'author_id'],
    ['table' => 'webauthn_credentials', 'column' => 'member_id'],
    ['table' => 'groups', 'column' => 'created_by_id'],
    ['table' => 'ai_conversations', 'column' => 'member_id'],
    ['table' => 'ai_messages', 'column' => 'member_id'],
    ['table' => 'marketplace_prospects', 'column' => 'sharer_user_id'],
    ['table' => 'notifications', 'column' => 'member_id'],
    ['table' => 'love_gift_claims', 'column' => 'sharer_id'],
    ['table' => 'love_gift_claims', 'column' => 'seller_id'],
    ['table' => 'testimonies', 'column' => 'member_id'],
    ['table' => 'sermon_quizzes', 'column' => 'created_by_id'],
    ['table' => 'account_recovery_codes', 'column' => 'member_id'],
    ['table' => 'sso_tokens', 'column' => 'member_id'],
    ['table' => 'multimedia_sop_tasks', 'column' => 'completed_by_id']
];

// Start transaction
$pdo->beginTransaction();

try {
    foreach ($groups as $index => $group) {
        $num = $index + 1;
        $name = $group['name'];
        $survivorId = $group['survivor_id'];
        $duplicateId = $group['duplicate_id'];
        $forceOverwrites = $group['force_overwrites'];

        echo "--------------------------------------------------\n";
        echo "Group {$num}: Merging {$name} (Survivor: ID {$survivorId} ← Duplicate: ID {$duplicateId})\n";
        echo "--------------------------------------------------\n";

        // 1. Fetch survivor and duplicate records
        $stmt = $pdo->prepare("SELECT * FROM members WHERE id = :id");
        $stmt->execute(['id' => $survivorId]);
        $survivor = $stmt->fetch();

        $stmt->execute(['id' => $duplicateId]);
        $duplicate = $stmt->fetch();

        if (!$survivor) {
            throw new Exception("Survivor ID {$survivorId} not found in database.");
        }
        if (!$duplicate) {
            throw new Exception("Duplicate ID {$duplicateId} not found in database.");
        }

        // 2. Null out duplicate's email and username in database to avoid UNIQUE key conflicts
        // when we copy these values to the survivor row.
        $stmtNullify = $pdo->prepare("UPDATE members SET email = NULL, username = NULL WHERE id = :duplicate_id");
        $stmtNullify->execute(['duplicate_id' => $duplicateId]);
        echo "   🔒 Temp-nullified email and username on duplicate ID {$duplicateId} in DB to avoid UNIQUE key conflicts.\n";

        // 3. Compute profile fields to copy (from PHP memory array of duplicate fetched in step 1)
        $updates = [];
        $copiedFields = [];
        
        // Fields to always overwrite from the duplicate to the survivor if present on the duplicate
        $overwrite_columns = ['email', 'phone', 'username', 'password', 'last_login', 'webauthn_challenge'];

        // Handle generic empty-field copies and overwrite columns
        foreach ($copyable_columns as $col) {
            $survVal = $survivor[$col];
            $dupVal = $duplicate[$col];

            // If duplicate has a non-empty value
            if ($dupVal !== null && $dupVal !== '') {
                // If column is in overwrite list, or survivor is empty
                if (in_array($col, $overwrite_columns) || $survVal === null || $survVal === '') {
                    $updates[$col] = $dupVal;
                    $actionType = (in_array($col, $overwrite_columns) && $survVal !== null && $survVal !== '') ? "overwritten" : "copied";
                    $copiedFields[] = "{$col} ({$actionType} value: '" . substr(strval($dupVal), 0, 30) . "')";
                }
            }
        }

        // Handle force overwrites (custom ones)
        foreach ($forceOverwrites as $col => $val) {
            $updates[$col] = $val;
            $copiedFields[] = "{$col} (forced overwrite: '{$val}')";
        }

        // Apply profile updates to Survivor if any exist
        if (!empty($updates)) {
            $setClause = [];
            foreach (array_keys($updates) as $col) {
                $setClause[] = "`{$col}` = :{$col}";
            }
            $updateSql = "UPDATE members SET " . implode(', ', $setClause) . " WHERE id = :survivor_id";
            $updates['survivor_id'] = $survivorId;
            
            $stmtUpdate = $pdo->prepare($updateSql);
            $stmtUpdate->execute($updates);
            echo "   📝 Profile fields copied: " . implode(', ', $copiedFields) . "\n";
        } else {
            echo "   📝 No missing profile fields to copy.\n";
        }

        // 4. Resolve unique-constraint conflicts in relationship tables BEFORE updating
        
        // A. post_likes (Unique: post_id, member_id)
        $stmtDelLikes = $pdo->prepare("
            DELETE FROM post_likes 
            WHERE member_id = :duplicate_id 
              AND post_id IN (
                  SELECT post_id FROM (
                      SELECT post_id FROM post_likes WHERE member_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelLikes->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);
        $deletedLikes = $stmtDelLikes->rowCount();
        if ($deletedLikes > 0) {
            echo "   🧹 Removed {$deletedLikes} duplicate post likes.\n";
        }

        // B. comment_likes (Unique: comment_id, member_id)
        $stmtDelCommLikes = $pdo->prepare("
            DELETE FROM comment_likes 
            WHERE member_id = :duplicate_id 
              AND comment_id IN (
                  SELECT comment_id FROM (
                      SELECT comment_id FROM comment_likes WHERE member_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelCommLikes->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);
        $deletedCommLikes = $stmtDelCommLikes->rowCount();
        if ($deletedCommLikes > 0) {
            echo "   🧹 Removed {$deletedCommLikes} duplicate comment likes.\n";
        }

        // C. member_follows (Unique: follower_id, following_id)
        // Clean up self-follows that would arise (e.g. duplicate follows survivor, or survivor follows duplicate)
        $stmtDelSelfFollow1 = $pdo->prepare("DELETE FROM member_follows WHERE follower_id = :duplicate_id AND following_id = :survivor_id");
        $stmtDelSelfFollow1->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);
        $stmtDelSelfFollow2 = $pdo->prepare("DELETE FROM member_follows WHERE follower_id = :survivor_id AND following_id = :duplicate_id");
        $stmtDelSelfFollow2->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);

        // Delete duplicates when duplicate is follower
        $stmtDelFollows1 = $pdo->prepare("
            DELETE FROM member_follows 
            WHERE follower_id = :duplicate_id 
              AND following_id IN (
                  SELECT following_id FROM (
                      SELECT following_id FROM member_follows WHERE follower_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelFollows1->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);

        // Delete duplicates when duplicate is following
        $stmtDelFollows2 = $pdo->prepare("
            DELETE FROM member_follows 
            WHERE following_id = :duplicate_id 
              AND follower_id IN (
                  SELECT follower_id FROM (
                      SELECT follower_id FROM member_follows WHERE following_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelFollows2->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);

        // D. member_badges (Unique: member_id, badge_type)
        $stmtDelBadges = $pdo->prepare("
            DELETE FROM member_badges 
            WHERE member_id = :duplicate_id 
              AND badge_type IN (
                  SELECT badge_type FROM (
                      SELECT badge_type FROM member_badges WHERE member_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelBadges->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);
        $deletedBadges = $stmtDelBadges->rowCount();
        if ($deletedBadges > 0) {
            echo "   🧹 Removed {$deletedBadges} duplicate member badges.\n";
        }

        // E. group_members (Unique: group_id, member_id)
        $stmtDelGrpMem = $pdo->prepare("
            DELETE FROM group_members 
            WHERE member_id = :duplicate_id 
              AND group_id IN (
                  SELECT group_id FROM (
                      SELECT group_id FROM group_members WHERE member_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelGrpMem->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);
        $deletedGrpMem = $stmtDelGrpMem->rowCount();
        if ($deletedGrpMem > 0) {
            echo "   🧹 Removed {$deletedGrpMem} duplicate group memberships.\n";
        }

        // F. quiz_submissions (Unique: question_id, member_id)
        $stmtDelQuizSub = $pdo->prepare("
            DELETE FROM quiz_submissions 
            WHERE member_id = :duplicate_id 
              AND question_id IN (
                  SELECT question_id FROM (
                      SELECT question_id FROM quiz_submissions WHERE member_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelQuizSub->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);
        $deletedQuizSub = $stmtDelQuizSub->rowCount();
        if ($deletedQuizSub > 0) {
            echo "   🧹 Removed {$deletedQuizSub} duplicate quiz submissions.\n";
        }

        // G. quiz_rewards (Unique: quiz_id, member_id)
        $stmtDelQuizRew = $pdo->prepare("
            DELETE FROM quiz_rewards 
            WHERE member_id = :duplicate_id 
              AND quiz_id IN (
                  SELECT quiz_id FROM (
                      SELECT quiz_id FROM quiz_rewards WHERE member_id = :survivor_id
                  ) as temp
              )
        ");
        $stmtDelQuizRew->execute(['duplicate_id' => $duplicateId, 'survivor_id' => $survivorId]);
        $deletedQuizRew = $stmtDelQuizRew->rowCount();
        if ($deletedQuizRew > 0) {
            echo "   🧹 Removed {$deletedQuizRew} duplicate quiz rewards.\n";
        }

        // 5. Transfer foreign key relations
        foreach ($relation_updates as $rel) {
            $table = $rel['table'];
            $col = $rel['column'];

            $updateRelSql = "UPDATE `{$table}` SET `{$col}` = :survivor_id WHERE `{$col}` = :duplicate_id";
            $stmtRel = $pdo->prepare($updateRelSql);
            $stmtRel->execute(['survivor_id' => $survivorId, 'duplicate_id' => $duplicateId]);
            $rows = $stmtRel->rowCount();
            if ($rows > 0) {
                echo "   🔄 Updated {$rows} rows in table '{$table}' (column '{$col}')\n";
            }
        }

        // Special check: update relation columns where constraint requires unique, like post_likes or group_members
        // which were handled in step 4, but let's run their main update statements now:
        $composite_rel_updates = [
            ['table' => 'post_likes', 'column' => 'member_id'],
            ['table' => 'comment_likes', 'column' => 'member_id'],
            ['table' => 'member_follows', 'column' => 'follower_id'],
            ['table' => 'member_follows', 'column' => 'following_id'],
            ['table' => 'member_badges', 'column' => 'member_id'],
            ['table' => 'group_members', 'column' => 'member_id'],
            ['table' => 'quiz_submissions', 'column' => 'member_id'],
            ['table' => 'quiz_rewards', 'column' => 'member_id']
        ];
        foreach ($composite_rel_updates as $rel) {
            $table = $rel['table'];
            $col = $rel['column'];
            $stmtRel = $pdo->prepare("UPDATE `{$table}` SET `{$col}` = :survivor_id WHERE `{$col}` = :duplicate_id");
            $stmtRel->execute(['survivor_id' => $survivorId, 'duplicate_id' => $duplicateId]);
            $rows = $stmtRel->rowCount();
            if ($rows > 0) {
                echo "   🔄 [Composite] Updated {$rows} rows in table '{$table}' (column '{$col}')\n";
            }
        }

        // 6. Delete duplicate member shell
        $stmtDelete = $pdo->prepare("DELETE FROM members WHERE id = :id");
        $stmtDelete->execute(['id' => $duplicateId]);
        echo "   ❌ Deleted duplicate member record (ID {$duplicateId})\n";
    }

    echo "\n==================================================\n";
    if ($dryRun) {
        $pdo->rollBack();
        echo "   DRY-RUN COMPLETE: TRANSACTION ROLLED BACK SUCCESS\n";
        echo "   Database remains completely unchanged.\n";
    } else {
        $pdo->commit();
        echo "   COMMIT COMPLETE: TRANSACTION PERMANENTLY SAVED\n";
        echo "   Database was updated and duplicate members merged.\n";
    }
    echo "==================================================\n";

} catch (Exception $e) {
    $pdo->rollBack();
    echo "\n❌ MERGE FAILED WITH EXCEPTION:\n";
    echo "   " . $e->getMessage() . "\n";
    echo "   Transaction rolled back. No database changes were saved.\n";
    exit(1);
}
