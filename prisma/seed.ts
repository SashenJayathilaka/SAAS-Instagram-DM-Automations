/**
 * Demo seed — populates the database with clearly-marked sample data.
 *
 * Run:  npm run db:seed
 * Reset + reseed:  npx prisma migrate reset --force && npm run db:seed
 *
 * All records use DEMO_CLERK_ID so they can be identified and deleted without
 * affecting real user data.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_CLERK_ID = "demo_seed_user_001";
const DEMO_EMAIL = "demo@replyflow-seed.local";
const DEMO_IG_ID = "demo_ig_account_000";

async function main() {
  console.log("🌱 Seeding demo data...");

  // -------------------------------------------------------------------------
  // 1. Demo user
  // -------------------------------------------------------------------------
  const user = await prisma.user.upsert({
    where: { clerkId: DEMO_CLERK_ID },
    update: {},
    create: {
      clerkId: DEMO_CLERK_ID,
      email: DEMO_EMAIL,
      firstname: "Demo",
      lastname: "User",
    },
  });
  console.log(`  ✓ User: ${user.email} (${user.id})`);

  // -------------------------------------------------------------------------
  // 2. Subscription (FREE by default — upgrade to PRO manually via Stripe)
  // -------------------------------------------------------------------------
  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      plan: "FREE",
    },
  });
  console.log(`  ✓ Subscription: ${subscription.plan}`);

  // -------------------------------------------------------------------------
  // 3. Instagram integration (fake token — won't make real API calls)
  // -------------------------------------------------------------------------
  const existingIntegration = await prisma.integrations.findFirst({
    where: { userId: user.id },
  });
  if (!existingIntegration) {
    await prisma.integrations.create({
      data: {
        userId: user.id,
        name: "INSTAGRAM",
        token: `demo_token_${Date.now()}`,
        instagramId: DEMO_IG_ID,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      },
    });
    console.log("  ✓ Integration: Instagram (demo token)");
  }

  // -------------------------------------------------------------------------
  // 4. Sample automation — "Summer Sale Campaign"
  // -------------------------------------------------------------------------
  const existingAutomation = await prisma.automation.findFirst({
    where: { userId: user.id, name: "Summer Sale Campaign [DEMO]" },
  });

  if (!existingAutomation) {
    const automation = await prisma.automation.create({
      data: {
        name: "Summer Sale Campaign [DEMO]",
        userId: user.id,
        active: true,
        matchingMode: "CONTAINS",
        keywords: {
          create: [
            { word: "price" },
            { word: "discount" },
            { word: "sale" },
            { word: "info" },
          ],
        },
        trigger: {
          create: { type: "COMMENT" },
        },
        posts: {
          create: {
            postid: "demo_post_001",
            caption: "Check out our summer sale! 🌞 Comment 'price' for details.",
            media: "https://via.placeholder.com/400x400.png?text=Demo+Post",
            mediaType: "IMAGE",
          },
        },
        listener: {
          create: {
            listener: "MESSAGE",
            prompt:
              "Hey {{username}}! Thanks for your interest 🙌 Here's the link to our summer sale: {{link}} — use code SUMMER20 for 20% off!",
            commentReply: "Thanks for asking, {{username}}! Check your DMs 📩",
            ctaLink: "https://example.com/summer-sale",
          },
        },
      },
    });
    console.log(`  ✓ Automation: "${automation.name}" (${automation.id})`);

    // -----------------------------------------------------------------------
    // 5. Sample analytics events
    // -----------------------------------------------------------------------
    const now = new Date();
    const events = [
      // Week 1
      ...Array.from({ length: 12 }, (_, i) => ({
        automationId: automation.id,
        eventType: "COMMENT_RECEIVED" as const,
        igUserId: `demo_user_${i}`,
        keyword: "info",
        createdAt: new Date(now.getTime() - (7 - Math.floor(i / 2)) * 86400000),
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        automationId: automation.id,
        eventType: "DM_SENT" as const,
        igUserId: `demo_user_${i}`,
        keyword: "info",
        createdAt: new Date(now.getTime() - (7 - Math.floor(i / 2)) * 86400000),
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        automationId: automation.id,
        eventType: "DM_FAILED" as const,
        igUserId: `demo_user_fail_${i}`,
        keyword: "price",
        createdAt: new Date(now.getTime() - 3 * 86400000),
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        automationId: automation.id,
        eventType: "NO_MATCH" as const,
        igUserId: `demo_user_nm_${i}`,
        keyword: "hello",
        createdAt: new Date(now.getTime() - 2 * 86400000),
      })),
    ];

    await prisma.automationEvent.createMany({ data: events });
    console.log(`  ✓ AutomationEvents: ${events.length} demo events`);

    // -----------------------------------------------------------------------
    // 6. Sample message logs
    // -----------------------------------------------------------------------
    const logs = Array.from({ length: 10 }, (_, i) => ({
      automationId: automation.id,
      recipientIgId: `demo_user_${i}`,
      messageType: "DM" as const,
      status: "SENT" as const,
      createdAt: new Date(now.getTime() - (6 - i) * 86400000),
    }));
    await prisma.messageLog.createMany({ data: logs });
    console.log(`  ✓ MessageLogs: ${logs.length} demo sent DMs`);

    // -----------------------------------------------------------------------
    // 7. Sample leads
    // -----------------------------------------------------------------------
    const leads = Array.from({ length: 8 }, (_, i) => ({
      automationId: automation.id,
      igUserId: `demo_user_${i}`,
      igUsername: `demo_follower_${i + 1}`,
      commentText: i % 2 === 0 ? "info" : "price",
      mediaId: "demo_post_001",
      createdAt: new Date(now.getTime() - (6 - i) * 86400000),
    }));
    await prisma.lead.createMany({ data: leads });
    console.log(`  ✓ Leads: ${leads.length} demo leads`);
  } else {
    console.log("  ℹ  Demo automation already exists — skipping event/log seed");
  }

  // -------------------------------------------------------------------------
  // 8. Second automation — "Product Launch" (inactive draft)
  // -------------------------------------------------------------------------
  const existingDraft = await prisma.automation.findFirst({
    where: { userId: user.id, name: "Product Launch [DEMO]" },
  });
  if (!existingDraft) {
    await prisma.automation.create({
      data: {
        name: "Product Launch [DEMO]",
        userId: user.id,
        active: false,
        matchingMode: "EXACT",
        keywords: {
          create: [{ word: "launch" }, { word: "waitlist" }],
        },
        trigger: {
          create: { type: "COMMENT" },
        },
        listener: {
          create: {
            listener: "MESSAGE",
            prompt: "Hey {{username}}! You're on the waitlist 🎉 We'll DM you when we go live.",
            ctaLink: "https://example.com/waitlist",
          },
        },
      },
    });
    console.log('  ✓ Automation: "Product Launch [DEMO]" (inactive draft)');
  }

  console.log("\n✅ Demo seed complete.");
  console.log(`   Sign in with clerkId: ${DEMO_CLERK_ID}`);
  console.log("   Note: demo tokens are fake — real Instagram API calls will fail.");
  console.log("   To clean up: DELETE FROM \"User\" WHERE \"clerkId\" = 'demo_seed_user_001';");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
