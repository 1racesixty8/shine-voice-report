import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { app } from '../server.js';
import { getManagementRecipients, getReportRoutingStatus, warnIfReportRoutingMissing } from '../report-routing.js';

test('routing status handles missing, empty and separator-only recipient lists', () => {
  for (const value of [null, '', '  ', ', ,']) {
    assert.deepEqual(getReportRoutingStatus(value), {
      managementEmailsSet: false,
      includesReportsInbox: false
    });
  }
});

test('routing status uses exact case-insensitive matches from the send parser', () => {
  const value = ' other@example.org, REPORTS@SHINEVOICEREPORT.ORG , ';
  assert.deepEqual(getManagementRecipients(value), ['other@example.org', 'REPORTS@SHINEVOICEREPORT.ORG']);
  assert.deepEqual(getReportRoutingStatus(value), {
    managementEmailsSet: true,
    includesReportsInbox: true
  });
  for (const recipient of ['other@example.org', 'notreports@shinevoicereport.org', 'reports@shinevoicereport.org.evil.example']) {
    assert.deepEqual(getReportRoutingStatus(recipient), {
      managementEmailsSet: true,
      includesReportsInbox: false
    });
  }
});

test('missing routing logs a value-free warning but configured routing does not', () => {
  const messages = [];
  const logger = { error: (message) => messages.push(message) };
  warnIfReportRoutingMissing('', logger);
  warnIfReportRoutingMissing('private@example.org', logger);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /WARNING.*MANAGEMENT_EMAILS/);
  assert.doesNotMatch(messages[0], /@/);
});

test('serverless startup warns when MANAGEMENT_EMAILS is absent', () => {
  const environment = { ...process.env, VERCEL: '1', DOTENV_CONFIG_PATH: '/dev/null' };
  delete environment.MANAGEMENT_EMAILS;
  const result = spawnSync(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: environment,
    encoding: 'utf8',
    timeout: 30000
  });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /SHINE CONFIGURATION WARNING: MANAGEMENT_EMAILS/);
});

test('health exposes only routing booleans, reads current settings and disables caching', async (context) => {
  const previousRecipients = process.env.MANAGEMENT_EMAILS;
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => {
    server.close();
    if (previousRecipients === undefined) delete process.env.MANAGEMENT_EMAILS;
    else process.env.MANAGEMENT_EMAILS = previousRecipients;
  });
  const url = `http://127.0.0.1:${server.address().port}/health`;
  for (const value of ['', 'private@example.org', 'private@example.org, reports@shinevoicereport.org']) {
    if (value) process.env.MANAGEMENT_EMAILS = value;
    else delete process.env.MANAGEMENT_EMAILS;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.text();
    const health = JSON.parse(body);
    assert.equal(health.ok, true);
    assert.deepEqual(health.reportRouting, getReportRoutingStatus(value));
    assert.ok(Object.values(health.reportRouting).every((value) => typeof value === 'boolean'));
    assert.doesNotMatch(body, /@|RESEND_API_KEY|FROM_EMAIL/);
  }
});
