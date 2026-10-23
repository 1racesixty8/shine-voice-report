function getManagementRecipients(value = process.env.MANAGEMENT_EMAILS) {
  return (value || '').split(',').map((email) => email.trim()).filter(Boolean);
}

function getReportRoutingStatus(value = process.env.MANAGEMENT_EMAILS) {
  const recipients = getManagementRecipients(value);
  return {
    managementEmailsSet: recipients.length > 0,
    includesReportsInbox: recipients.some((email) => email.toLowerCase() === 'reports@shinevoicereport.org')
  };
}

function warnIfReportRoutingMissing(value = process.env.MANAGEMENT_EMAILS, logger = console) {
  if (!getReportRoutingStatus(value).managementEmailsSet) {
    logger.error('SHINE CONFIGURATION WARNING: MANAGEMENT_EMAILS has no recipients; incident report email delivery will fail.');
  }
}

export { getManagementRecipients, getReportRoutingStatus, warnIfReportRoutingMissing };
