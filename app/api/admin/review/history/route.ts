import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50")));
  const search = (searchParams.get("search") || "").trim();
  const typeFilter = searchParams.get("type") || "all"; // "all" | "registrations" | "ministries"
  const statusFilter = searchParams.get("status") || "all"; // "all" | "active" | "approved" | "pending" | "inactive"
  const skip = (page - 1) * limit;

  try {
    if (typeFilter === "ministries") {
      // Query member ministries
      const where: any = {};
      if (statusFilter !== "all") {
        if (statusFilter === "active" || statusFilter === "approved") {
          where.status = "active";
        } else if (statusFilter === "pending") {
          where.status = "pending";
        } else if (statusFilter === "inactive") {
          where.status = "inactive";
        }
      }

      if (search) {
        where.OR = [
          { member: { firstName: { contains: search } } },
          { member: { lastName: { contains: search } } },
          { member: { email: { contains: search } } },
          { member: { phone: { contains: search } } },
          { ministry: { name: { contains: search } } },
        ];
      }

      const [total, records] = await Promise.all([
        db.memberMinistry.count({ where }),
        db.memberMinistry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { requestedAt: "desc" },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                type: true,
                ageGroup: true,
                address: true,
                invitedBy: true,
              },
            },
            ministry: {
              select: { id: true, name: true },
            },
          },
        }),
      ]);

      const items = records.map((r) => ({
        id: r.id,
        kind: "ministry" as const,
        name: `${r.member.firstName} ${r.member.lastName}`,
        firstName: r.member.firstName,
        lastName: r.member.lastName,
        email: r.member.email,
        phone: r.member.phone,
        memberType: r.member.type,
        ageGroup: r.member.ageGroup,
        address: r.member.address,
        invitedBy: r.member.invitedBy,
        status: r.status,
        createdAt: r.requestedAt ? r.requestedAt.toISOString() : r.createdAt.toISOString(),
        updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
        details: {
          ministryName: r.ministry.name,
          ministryId: r.ministry.id,
          memberMinistryId: r.id,
          memberId: r.member.id,
        },
        isDuplicate: false,
        duplicateReasons: [] as string[],
      }));

      return NextResponse.json({
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        limit,
      });
    }

    // Otherwise: Query Member Registrations (or all member records)
    const memberWhere: any = {};
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        memberWhere.status = { in: ["active", "approved"] };
      } else if (statusFilter === "pending") {
        memberWhere.status = "pending";
      } else if (statusFilter === "inactive") {
        memberWhere.status = { in: ["inactive", "archived"] };
      }
    }

    if (search) {
      memberWhere.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { invitedBy: { contains: search } },
      ];
    }

    const [total, members] = await Promise.all([
      db.member.count({ where: memberWhere }),
      db.member.findMany({
        where: memberWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          type: true,
          ageGroup: true,
          address: true,
          invitedBy: true,
          joinDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          ministries: {
            include: { ministry: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    // Check duplicate registrations in database for the fetched items
    const phones = members.map((m) => m.phone).filter((p): p is string => Boolean(p && p.trim() && p !== "09000000000"));
    const emails = members.map((m) => m.email).filter((e): e is string => Boolean(e && e.trim()));

    const [duplicatePhones, duplicateEmails, allMembersWithName] = await Promise.all([
      phones.length > 0
        ? db.member.groupBy({
            by: ["phone"],
            where: { phone: { in: phones } },
            _count: { id: true },
            having: { id: { _count: { gt: 1 } } },
          })
        : [],
      emails.length > 0
        ? db.member.groupBy({
            by: ["email"],
            where: { email: { in: emails } },
            _count: { id: true },
            having: { id: { _count: { gt: 1 } } },
          })
        : [],
      members.length > 0
        ? db.member.findMany({
            where: {
              OR: members.map((m) => ({
                firstName: { equals: m.firstName },
                lastName: { equals: m.lastName },
              })),
            },
            select: { id: true, firstName: true, lastName: true },
          })
        : [],
    ]);

    const dupPhoneSet = new Set(duplicatePhones.map((g) => g.phone));
    const dupEmailSet = new Set(duplicateEmails.map((g) => g.email));

    // Count name frequencies
    const nameCounts: Record<string, number> = {};
    for (const m of allMembersWithName) {
      const key = `${m.firstName.trim().toLowerCase()} ${m.lastName.trim().toLowerCase()}`;
      nameCounts[key] = (nameCounts[key] || 0) + 1;
    }

    const items = members.map((m) => {
      const reasons: string[] = [];
      const fullNameKey = `${m.firstName.trim().toLowerCase()} ${m.lastName.trim().toLowerCase()}`;

      if (m.phone && dupPhoneSet.has(m.phone)) {
        reasons.push("Duplicate Phone Number");
      }
      if (m.email && dupEmailSet.has(m.email)) {
        reasons.push("Duplicate Email Address");
      }
      if ((nameCounts[fullNameKey] || 0) > 1) {
        reasons.push("Duplicate Full Name");
      }

      return {
        id: m.id,
        kind: "registration" as const,
        name: `${m.firstName} ${m.lastName}`,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone,
        memberType: m.type,
        ageGroup: m.ageGroup,
        address: m.address,
        invitedBy: m.invitedBy,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt ? m.updatedAt.toISOString() : null,
        details: {
          memberId: m.id,
          ministryCount: m.ministries.length,
          ministries: m.ministries.map((mm) => mm.ministry.name),
        },
        isDuplicate: reasons.length > 0,
        duplicateReasons: reasons,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/review/history:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
