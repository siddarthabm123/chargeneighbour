import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  encryptSnapshot,
  decryptSnapshot,
} from "../app/lib/backup-security.ts";

// Isolated PostgreSQL fixtures only. This script never connects to a live project.
const db = new PGlite();
try {
  async function initialize(target) {
    await target.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;`);
    for (const file of (
      await readdir(new URL("../supabase/migrations/", import.meta.url))
    )
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await target.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
  }
  await initialize(db);
  const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
  const owner = "11111111-1111-4111-8111-111111111111",
    driver = "22222222-2222-4222-8222-222222222222",
    stranger = "33333333-3333-4333-8333-333333333333";
  async function asUser(id) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: id, email: `${id.slice(0, 4)}@example.invalid` }),
    ]);
    await db.exec("set role authenticated");
  }
  async function asServer() {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims','{}',false)");
  }
  await db.exec("set role anon");
  await assert.rejects(
    db.query("select * from marketplace_requests"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select take_allowance('x',2,60)"),
    /permission denied/,
  );
  await asUser(owner);
  const key = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const application = (
    await db.query(
      "select (submit_marketplace_request('host',$1::jsonb,$2)).*",
      [
        JSON.stringify({
          name: "Synthetic host fixture",
          area: "Synthetic neighbourhood",
          permission: true,
        }),
        key,
      ],
    )
  ).rows[0];
  assert.equal(application.user_id, `supabase:${owner}`);
  assert.equal(
    (
      await one("select (submit_marketplace_request('host',$1::jsonb,$2)).id", [
        JSON.stringify({
          name: "Synthetic host fixture",
          area: "Synthetic neighbourhood",
          permission: true,
        }),
        key,
      ])
    ).id,
    application.id,
  );
  await assert.rejects(
    db.query(
      "select submit_marketplace_request('host','{}',gen_random_uuid())",
    ),
    /wait before submitting/,
  );
  await assert.rejects(
    db.query("update marketplace_requests set operator_reply='forged'"),
    /permission denied/,
  );
  await asUser(stranger);
  assert.equal(
    (await db.query("select * from marketplace_requests")).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "update marketplace_requests set status='cancelled' returning id",
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into marketplace_requests(id,user_id,email,kind,payload,status) values(gen_random_uuid(),$1,'fake@example.invalid','interest','{}','registered')",
      [`supabase:${owner}`],
    ),
    (e) => e.code === "42501",
  );
  await asServer();
  assert.equal(
    (await one("select take_allowance('fixture',2,60) as allowed")).allowed,
    true,
  );
  assert.equal(
    (await one("select take_allowance('fixture',2,60) as allowed")).allowed,
    true,
  );
  assert.equal(
    (await one("select take_allowance('fixture',2,60) as allowed")).allowed,
    false,
  );
  await db.query("select count_saved_application($1,'fixture')", [
    application.id,
  ]);
  await db.query("select count_saved_application($1,'fixture')", [
    application.id,
  ]);
  assert.equal(
    (await one("select count from funnel_daily where event='host_application'"))
      .count,
    1,
  );
  const listing = {
    name: "Synthetic database fixture",
    area: "Synthetic area",
    power_kw: 7.2,
    price_paise_kwh: 1600,
    access_notes: "Synthetic test access only",
    photos: ["https://example.invalid/fixture.jpg"],
    checks: {
      identity: true,
      permission: true,
      electrical: true,
      metering: true,
      access: true,
      support: true,
      evidence: "Isolated test fixture, not an actual inspection",
    },
  };
  const loc = {
    address: "Synthetic private test address",
    latitude: 12.9716,
    longitude: 77.5946,
  };
  const charger = (
    await one("select onboard_host($1,$2,$3,$4) as id", [
      application.id,
      `supabase:${owner}`,
      JSON.stringify(listing),
      JSON.stringify(loc),
    ])
  ).id;
  assert.equal(
    (
      await one("select onboard_host($1,$2,$3,$4) as id", [
        application.id,
        `supabase:${owner}`,
        JSON.stringify(listing),
        JSON.stringify(loc),
      ])
    ).id,
    charger,
  );
  assert.equal(
    (
      await one(
        "select latitude::float as latitude from host_chargers where id=$1",
        [charger],
      )
    ).latitude,
    12.97,
  );
  const start = new Date(Date.now() + 2 * 3600000).toISOString(),
    end = new Date(Date.now() + 3 * 3600000).toISOString();
  await db.query(
    "insert into host_slots(charger_id,starts_at,ends_at) values($1,$2,$3)",
    [charger, start, end],
  );
  const reserve = async (person, key) =>
    one("select (reserve_host($1,$2,$3,$4,$5)).*", [
      `supabase:${person}`,
      charger,
      start,
      end,
      key,
    ]);
  const booking = await reserve(driver, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  assert.equal(
    (await reserve(driver, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).id,
    booking.id,
  );
  await assert.rejects(
    reserve(stranger, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
    /unavailable/,
  );
  await asUser(stranger);
  assert.equal((await db.query("select * from reservations")).rows.length, 0);
  await assert.rejects(
    db.query("select * from host_locations"),
    /permission denied/,
  );
  await asUser(driver);
  assert.equal((await db.query("select * from reservations")).rows.length, 1);
  await asUser(owner);
  assert.equal((await db.query("select * from reservations")).rows.length, 1);
  await asServer();
  await db.query(
    "select operate_reservation($1,'fixture-operator','confirm',null,'fixture approval')",
    [booking.id],
  );
  // Advance the session into the start window without manipulating a real clock or project.
  await db.query(
    "update reservations set starts_at=now()-interval '1 minute',ends_at=now()+interval '1 hour' where id=$1",
    [booking.id],
  );
  await db.query(
    "select operate_reservation($1,'fixture-operator','start',100,'fixture meter')",
    [booking.id],
  );
  await db.query(
    "select operate_reservation($1,'fixture-operator','finish',110,'fixture meter')",
    [booking.id],
  );
  const measured = await one("select * from reservations where id=$1", [
    booking.id,
  ]);
  assert.equal(measured.amount_paise, 16000);
  assert.equal(measured.commission_paise, 2400);
  await assert.rejects(
    db.query(
      "select operate_reservation($1,'fixture-operator','finish',120,'repeat')",
      [booking.id],
    ),
    /Invalid session transition/,
  );
  await db.query(
    "update reservations set order_id='order_fixture',payment_status='pending' where id=$1",
    [booking.id],
  );
  await assert.rejects(
    db.query(
      "select record_payment('bad','order_fixture','pay_fixture',1,'INR',false)",
    ),
    /mismatch/,
  );
  await db.query(
    "select record_payment('capture-1','order_fixture','pay_fixture',16000,'INR',false)",
  );
  await db.query(
    "select record_payment('capture-1','order_fixture','pay_fixture',16000,'INR',false)",
  );
  assert.equal(
    (await one("select count(*)::integer as count from session_ledger")).count,
    1,
  );
  assert.equal(
    (await one("select host_paise from session_ledger")).host_paise,
    13600,
  );
  await db.query(
    "select record_payment('refund-1','order_fixture','pay_fixture',16000,'INR',true)",
  );
  await db.query(
    "select record_payment('late-capture','order_fixture','pay_fixture',16000,'INR',false)",
  );
  assert.equal(
    (
      await one("select payment_status from reservations where id=$1", [
        booking.id,
      ])
    ).payment_status,
    "refunded",
  );
  assert.equal(
    (await one("select settlement_status from session_ledger"))
      .settlement_status,
    "refunded",
  );
  await asUser(owner);
  await db.query(
    "update marketplace_requests set status='cancelled' where id=$1",
    [application.id],
  );
  assert.ok(
    (
      await one("select withdrawn_at from marketplace_requests where id=$1", [
        application.id,
      ])
    ).withdrawn_at,
  );
  await asServer();
  const snapshot = (await one("select export_pilot_snapshot() as snapshot"))
    .snapshot;
  const passphrase = "isolated-test-passphrase-for-backup";
  const envelope = encryptSnapshot(snapshot, passphrase);
  assert.deepEqual(decryptSnapshot(envelope, passphrase), snapshot);
  assert.throws(() => decryptSnapshot(envelope, "wrong-isolated-passphrase"));
  const restored = new PGlite();
  try {
    await initialize(restored);
    await restored.exec(
      "alter table marketplace_requests disable trigger user",
    );
    for (const table of [
      "marketplace_requests",
      "host_chargers",
      "host_locations",
      "host_slots",
      "reservations",
      "operation_events",
      "payment_events",
      "session_ledger",
      "support_tickets",
      "funnel_daily",
    ]) {
      for (const row of snapshot.tables[table]) {
        const columns = Object.keys(row);
        assert.ok(columns.every((c) => /^[a-z_]+$/.test(c)));
        await restored.query(
          "insert into " +
            table +
            "(" +
            columns.map((c) => '"' + c + '"').join(",") +
            ") values(" +
            columns.map((_, i) => "$" + (i + 1)).join(",") +
            ")",
          columns.map((c) =>
            row[c] !== null && typeof row[c] === "object"
              ? JSON.stringify(row[c])
              : row[c],
          ),
        );
      }
      assert.equal(
        (await restored.query("select count(*)::integer as n from " + table))
          .rows[0].n,
        snapshot.tables[table].length,
      );
    }
    await restored.exec("alter table marketplace_requests enable trigger user");
  } finally {
    await restored.close();
  }
  console.log(
    "PASS: encrypted application-data snapshot, rejected wrong passphrase, and isolated PostgreSQL restoration with matching table counts.",
  );
  console.log(
    "PASS: PostgreSQL migrations, owner/stranger RLS, denied privilege escalation, idempotent applications, atomic quotas, verified onboarding, reservation overlap rejection, participant isolation, metered billing, verified payment/refund replay protection and withdrawal timestamps.",
  );
} catch (error) {
  console.error({
    message: error.message,
    code: error.code,
    position: error.position,
    where: error.where,
  });
  process.exitCode = 1;
} finally {
  await db.close();
}
