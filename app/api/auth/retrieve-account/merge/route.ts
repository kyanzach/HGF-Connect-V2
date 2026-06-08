import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, otpCode, duplicateIds } = body;

    if (!memberId || !otpCode) {
      return NextResponse.json({ error: "Member ID and OTP code are required." }, { status: 400 });
    }

    const primaryId = Number(memberId);
    if (isNaN(primaryId)) {
      return NextResponse.json({ error: "Invalid Member ID." }, { status: 400 });
    }

    // 1. Verify OTP
    const recoveryCode = await db.accountRecoveryCode.findFirst({
      where: {
        memberId: primaryId,
        code: otpCode,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!recoveryCode) {
      return NextResponse.json({ error: "Invalid or expired OTP code." }, { status: 400 });
    }

    // Delete recovery codes immediately to prevent reuse
    await db.accountRecoveryCode.deleteMany({
      where: { memberId: primaryId },
    });

    // 2. Load primary profile
    const primary = await db.member.findUnique({
      where: { id: primaryId },
    });

    if (!primary) {
      return NextResponse.json({ error: "Primary member profile not found." }, { status: 404 });
    }

    // 3. Reset password of primary account to "Godisgood"
    const hashedPassword = bcrypt.hashSync("Godisgood", 10);
    
    // Ensure primary has a username
    let finalUsername = primary.username;

    // 4. Perform account merging
    if (duplicateIds && Array.isArray(duplicateIds) && duplicateIds.length > 0) {
      for (const dupId of duplicateIds) {
        const duplicateId = Number(dupId);
        if (isNaN(duplicateId) || duplicateId === primaryId) continue;

        const duplicate = await db.member.findUnique({
          where: { id: duplicateId },
        });

        if (!duplicate) continue;

        // A. Resolve username collision: if primary has no username but duplicate does
        let dupUsernameUpdate: any = {};
        if (!finalUsername && duplicate.username) {
          finalUsername = duplicate.username;
          
          // Clear duplicate's username first to prevent unique index violation on update
          await db.member.update({
            where: { id: duplicateId },
            data: { username: null },
          });
        }

        // B. Merge missing profile fields from duplicate to primary
        const updatedFields: any = {
          password: hashedPassword, // Reset password to "Godisgood"
        };
        
        if (!primary.email && duplicate.email) updatedFields.email = duplicate.email;
        if (!primary.profilePicture && duplicate.profilePicture) updatedFields.profilePicture = duplicate.profilePicture;
        if (!primary.profilePictureThumbnail && duplicate.profilePictureThumbnail) updatedFields.profilePictureThumbnail = duplicate.profilePictureThumbnail;
        if (!primary.coverPhoto && duplicate.coverPhoto) updatedFields.coverPhoto = duplicate.coverPhoto;
        if (!primary.phone && duplicate.phone) updatedFields.phone = duplicate.phone;
        if (!primary.address && duplicate.address) updatedFields.address = duplicate.address;
        if (!primary.birthdate && duplicate.birthdate) updatedFields.birthdate = duplicate.birthdate;
        if (!primary.joinDate && duplicate.joinDate) updatedFields.joinDate = duplicate.joinDate;
        if (!primary.baptismDate && duplicate.baptismDate) updatedFields.baptismDate = duplicate.baptismDate;
        if (!primary.familyMembers && duplicate.familyMembers) updatedFields.familyMembers = duplicate.familyMembers;
        if (!primary.ministryInvolvement && duplicate.ministryInvolvement) updatedFields.ministryInvolvement = duplicate.ministryInvolvement;
        if (!primary.favoriteVerse && duplicate.favoriteVerse) updatedFields.favoriteVerse = duplicate.favoriteVerse;
        if (!primary.gcashName && duplicate.gcashName) updatedFields.gcashName = duplicate.gcashName;
        if (!primary.gcashMobile && duplicate.gcashMobile) updatedFields.gcashMobile = duplicate.gcashMobile;
        if (!primary.username && finalUsername) updatedFields.username = finalUsername;

        // Apply profile updates
        await db.member.update({
          where: { id: primaryId },
          data: updatedFields,
        });

        // C. Clean up relation compound uniques to prevent transaction crashes
        // PostLike unique constraints
        const primaryLikes = await db.postLike.findMany({
          where: { memberId: primaryId },
          select: { postId: true },
        });
        const primaryLikedPostIds = primaryLikes.map((l) => l.postId);
        await db.postLike.deleteMany({
          where: {
            memberId: duplicateId,
            postId: { in: primaryLikedPostIds },
          },
        });

        // CommentLike unique constraints
        const primaryCommentLikes = await db.commentLike.findMany({
          where: { memberId: primaryId },
          select: { commentId: true },
        });
        const primaryLikedCommentIds = primaryCommentLikes.map((l) => l.commentId);
        await db.commentLike.deleteMany({
          where: {
            memberId: duplicateId,
            commentId: { in: primaryLikedCommentIds },
          },
        });

        // Follow unique constraints (Follower)
        const primaryFollowing = await db.follow.findMany({
          where: { followerId: primaryId },
          select: { followingId: true },
        });
        const primaryFollowingIds = primaryFollowing.map((f) => f.followingId);
        await db.follow.deleteMany({
          where: {
            followerId: duplicateId,
            followingId: { in: primaryFollowingIds },
          },
        });

        // Follow unique constraints (Following)
        const primaryFollowers = await db.follow.findMany({
          where: { followingId: primaryId },
          select: { followerId: true },
        });
        const primaryFollowerIds = primaryFollowers.map((f) => f.followerId);
        await db.follow.deleteMany({
          where: {
            followingId: duplicateId,
            followerId: { in: primaryFollowerIds },
          },
        });

        // GroupMember unique constraints
        const primaryGroups = await db.groupMember.findMany({
          where: { memberId: primaryId },
          select: { groupId: true },
        });
        const primaryGroupIds = primaryGroups.map((g) => g.groupId);
        await db.groupMember.deleteMany({
          where: {
            memberId: duplicateId,
            groupId: { in: primaryGroupIds },
          },
        });

        // D. Shift all relational foreign keys from duplicateId to primaryId
        await db.$transaction([
          db.event.updateMany({ where: { createdBy: duplicateId }, data: { createdBy: primaryId } }),
          db.attendanceRecord.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.attendanceRecord.updateMany({ where: { recordedById: duplicateId }, data: { recordedById: primaryId } }),
          db.memberMinistry.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.memberMinistry.updateMany({ where: { approvedById: duplicateId }, data: { approvedById: primaryId } }),
          db.memberStatusHistory.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.memberStatusHistory.updateMany({ where: { changedById: duplicateId }, data: { changedById: primaryId } }),
          db.smsLog.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.appLog.updateMany({ where: { performedById: duplicateId }, data: { performedById: primaryId } }),
          db.marketplaceListing.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.marketplaceMessage.updateMany({ where: { senderId: duplicateId }, data: { senderId: primaryId } }),
          db.marketplaceMessage.updateMany({ where: { receiverId: duplicateId }, data: { receiverId: primaryId } }),
          db.marketplaceReport.updateMany({ where: { reportedById: duplicateId }, data: { reportedById: primaryId } }),
          db.marketplaceReport.updateMany({ where: { reviewedById: duplicateId }, data: { reviewedById: primaryId } }),
          db.post.updateMany({ where: { authorId: duplicateId }, data: { authorId: primaryId } }),
          db.postLike.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.comment.updateMany({ where: { authorId: duplicateId }, data: { authorId: primaryId } }),
          db.commentLike.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.follow.updateMany({ where: { followerId: duplicateId }, data: { followerId: primaryId } }),
          db.follow.updateMany({ where: { followingId: duplicateId }, data: { followingId: primaryId } }),
          db.prayerRequest.updateMany({ where: { authorId: duplicateId }, data: { authorId: primaryId } }),
          db.prayerResponse.updateMany({ where: { authorId: duplicateId }, data: { authorId: primaryId } }),
          db.journalEntry.updateMany({ where: { authorId: duplicateId }, data: { authorId: primaryId } }),
          db.group.updateMany({ where: { createdById: duplicateId }, data: { createdById: primaryId } }),
          db.groupMember.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.listingShare.updateMany({ where: { sharerId: duplicateId }, data: { sharerId: primaryId } }),
          db.webauthnCredential.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.memberPhotoHistory.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.aiConversation.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.notification.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.memberBadge.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.loveGiftClaim.updateMany({ where: { sharerId: duplicateId }, data: { sharerId: primaryId } }),
          db.loveGiftClaim.updateMany({ where: { sellerId: duplicateId }, data: { sellerId: primaryId } }),
          db.testimony.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.quizSubmission.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          db.quizReward.updateMany({ where: { memberId: duplicateId }, data: { memberId: primaryId } }),
          
          // Delete duplicate member
          db.member.delete({ where: { id: duplicateId } }),
        ]);
      }
    } else {
      // No duplicates to merge, just reset primary password
      await db.member.update({
        where: { id: primaryId },
        data: { password: hashedPassword },
      });
    }

    // Default username fallback if still empty
    if (!finalUsername) {
      finalUsername = `${primary.firstName.toLowerCase()}.${primary.lastName.toLowerCase()}`.replace(/\s+/g, "");
      await db.member.update({
        where: { id: primaryId },
        data: { username: finalUsername },
      });
    }

    return NextResponse.json({ success: true, username: finalUsername });
  } catch (err: any) {
    console.error("[retrieve-account/merge]", err?.message);
    return NextResponse.json({ error: "Failed to merge profiles: " + err.message }, { status: 500 });
  }
}
