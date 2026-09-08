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
  const sort = searchParams.get("sort") || "newest"; // "newest" | "oldest" | "duplicates" | "name_asc" | "name_desc" | "type" | "age"
  const duplicatesOnly = searchParams.get("duplicatesOnly") === "true" || sort === "duplicates";
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

      let orderBy: any = { requestedAt: "desc" };
      if (sort === "oldest") {
        orderBy = { requestedAt: "asc" };
      } else if (sort === "name_asc") {
        orderBy = { member: { firstName: "asc" } };
      } else if (sort === "name_desc") {
        orderBy = { member: { firstName: "desc" } };
      }

      const [total, records] = await Promise.all([
        db.memberMinistry.count({ where }),
        db.memberMinistry.findMany({
          where,
          skip,
          take: limit,
          orderBy,
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

    // ── Member Registrations ──
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

    // Identify all duplicates across the database
    const [allDupPhones, allDupEmails, allNameGroups] = await Promise.all([
      db.member.groupBy({
        by: ["phone"],
        where: {
          phone: { not: null },
          AND: [
            { phone: { not: "" } },
            { phone: { not: "09000000000" } },
          ],
        },
        _count: { id: true },
        having: { id: { _count: { gt: 1 } } },
      }),
      db.member.groupBy({
        by: ["email"],
        where: {
          email: { not: null },
          AND: [{ email: { not: "" } }],
        },
        _count: { id: true },
        having: { id: { _count: { gt: 1 } } },
      }),
      db.$queryRaw<Array<{ first_name: string; last_name: string; cnt: number }>>`
        SELECT first_name, last_name, COUNT(*) as cnt
        FROM members
        WHERE first_name IS NOT NULL AND first_name != ''
        GROUP BY LOWER(TRIM(first_name)), LOWER(TRIM(last_name))
        HAVING cnt > 1
      `.catch(() => [] as Array<{ first_name: string; last_name: string; cnt: number }>),
    ]);

    const dupPhoneList = allDupPhones.map((g) => g.phone).filter(Boolean) as string[];
    const dupEmailList = allDupEmails.map((g) => g.email).filter(Boolean) as string[];
    const dupPhoneSet = new Set(dupPhoneList);
    const dupEmailSet = new Set(dupEmailList);
    const dupNameSet = new Set(allNameGroups.map((g) => `${g.first_name.trim().toLowerCase()} ${g.last_name.trim().toLowerCase()}`));

    // If duplicatesOnly or sort === 'duplicates', filter specifically for duplicates
    if (duplicatesOnly) {
      const dupConditions: any[] = [];
      if (dupPhoneList.length > 0) {
        dupConditions.push({ phone: { in: dupPhoneList } });
      }
      if (dupEmailList.length > 0) {
        dupConditions.push({ email: { in: dupEmailList } });
      }
      if (allNameGroups.length > 0) {
        dupConditions.push({
          OR: allNameGroups.map((g) => ({
            firstName: { equals: g.first_name },
            lastName: { equals: g.last_name },
          })),
        });
      }

      if (dupConditions.length > 0) {
        if (memberWhere.OR) {
          memberWhere.AND = [{ OR: memberWhere.OR }, { OR: dupConditions }];
          delete memberWhere.OR;
        } else {
          memberWhere.OR = dupConditions;
        }
      } else {
        // No duplicates exist
        memberWhere.id = -1;
      }
    }

    // Determine sorting
    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    } else if (sort === "name_asc") {
      orderBy = [{ firstName: "asc" }, { lastName: "asc" }, { createdAt: "desc" }];
    } else if (sort === "name_desc") {
      orderBy = [{ firstName: "desc" }, { lastName: "desc" }, { createdAt: "desc" }];
    } else if (sort === "type") {
      orderBy = [{ type: "asc" }, { firstName: "asc" }, { createdAt: "desc" }];
    } else if (sort === "age") {
      orderBy = [{ ageGroup: "asc" }, { firstName: "asc" }, { createdAt: "desc" }];
    } else if (sort === "duplicates") {
      // Group duplicates together by first & last name, then phone, then createdAt
      orderBy = [{ firstName: "asc" }, { lastName: "asc" }, { phone: "asc" }, { createdAt: "desc" }];
    }

    const [total, members] = await Promise.all([
      db.member.count({ where: memberWhere }),
      db.member.findMany({
        where: memberWhere,
        skip,
        take: limit,
        orderBy,
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

    const items = members.map((m) => {
      const reasons: string[] = [];
      const fullNameKey = `${m.firstName.trim().toLowerCase()} ${m.lastName.trim().toLowerCase()}`;

      if (m.phone && dupPhoneSet.has(m.phone)) {
        reasons.push("Matching Phone");
      }
      if (m.email && dupEmailSet.has(m.email)) {
        reasons.push("Matching Email");
      }
      if (dupNameSet.has(fullNameKey)) {
        reasons.push("Matching Name");
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
