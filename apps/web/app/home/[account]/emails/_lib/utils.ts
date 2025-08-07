// Helper function to refresh token if expired
export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: string;
}> {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenData = await tokenResponse.json();

  // Calculate new expiry time
  const expiresIn = tokenData.expires_in || 3600;
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

  return {
    access_token: tokenData.access_token,
    expires_at: expiresAt.toISOString(),
  };
}

// Helper function to fetch emails from Gmail
export async function fetchEmails(
  accessToken: string,
  query = '',
  pageToken = '',
) {
  const url = new URL('https://www.googleapis.com/gmail/v1/users/me/messages');

  if (query) {
    url.searchParams.append('q', query);
  }

  if (pageToken) {
    url.searchParams.append('pageToken', pageToken);
  }

  url.searchParams.append('maxResults', '100');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch emails: ${response.statusText}`);
  }

  return response.json();
}

// Helper function to fetch email details
export async function fetchEmailDetails(
  accessToken: string,
  messageId: string,
) {
  const response = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch email details: ${response.statusText}`);
  }

  return response.json();
}

// Helper function to parse email details
export function parseEmailDetails(message: any) {
  const headers = message.payload.headers;
  const threadId = message.threadId;
  const messageId = message.id;

  // Extract headers
  const getHeader = (name: string) => {
    const header = headers.find(
      (h: any) => h.name.toLowerCase() === name.toLowerCase(),
    );
    return header ? header.value : '';
  };

  const from = getHeader('from');
  const to = getHeader('to');
  const cc = getHeader('cc');
  const bcc = getHeader('bcc');
  const subject = getHeader('subject');
  const date = getHeader('date');

  // Parse from field to extract name and email
  let fromName = '';
  let fromEmail = from;

  const fromMatch = from.match(/(.*?)\s*<(.*)>/);
  if (fromMatch) {
    fromName = fromMatch[1].trim().replace(/["']/g, '');
    fromEmail = fromMatch[2];
  }

  // Parse to, cc, bcc fields
  const parseAddresses = (addressString: string) => {
    if (!addressString) return [];

    // Split by commas, but not commas inside quotes
    const addresses = addressString.match(/(?:[^,"]|"(?:\\.|[^"])*")+/g) || [];

    return addresses.map((addr) => {
      const match = addr.trim().match(/<([^>]*)>$/);
      return match ? match[1] : addr.trim();
    });
  };

  const toEmails = parseAddresses(to);
  const ccEmails = parseAddresses(cc);
  const bccEmails = parseAddresses(bcc);

  // Extract body
  let bodyText = '';
  let bodyHtml = '';

  function findBodyParts(part: any) {
    if (part.mimeType === 'text/plain' && part.body.data) {
      bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body.data) {
      bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      part.parts.forEach(findBodyParts);
    }
  }

  if (message.payload.body && message.payload.body.data) {
    // Simple message with no parts
    bodyText = Buffer.from(message.payload.body.data, 'base64').toString(
      'utf-8',
    );
  } else if (message.payload.parts) {
    // Multipart message
    message.payload.parts.forEach(findBodyParts);
  }

  // Check for attachments
  const hasAttachments =
    message.payload.parts?.some(
      (part: any) =>
        part.filename && part.filename.length > 0 && part.body.attachmentId,
    ) || false;

  // Extract attachment metadata (not downloading actual attachments)
  const attachmentData = hasAttachments
    ? message.payload.parts
        .filter(
          (part: any) =>
            part.filename && part.filename.length > 0 && part.body.attachmentId,
        )
        .map((part: any) => ({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId,
        }))
    : null;

  // Extract labels
  const labels = message.labelIds || [];
  const isRead = !labels.includes('UNREAD');
  const isStarred = labels.includes('STARRED');

  // Parse date
  const receivedAt = new Date(date).toISOString();

  return {
    gmail_id: messageId,
    thread_id: threadId,
    from_email: fromEmail,
    from_name: fromName,
    to_email: toEmails,
    cc_email: ccEmails,
    bcc_email: bccEmails,
    subject,
    body_text: bodyText,
    body_html: bodyHtml,
    received_at: receivedAt,
    labels,
    is_read: isRead,
    is_starred: isStarred,
    has_attachments: hasAttachments,
    attachment_data: attachmentData ? JSON.stringify(attachmentData) : null,
  };
}

// Helper function to create RFC 2822 formatted email
export function createEmailRFC2822(
  from: string,
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    subject ? `Subject: ${subject}` : '',
    cc ? `Cc: ${cc}` : '',
    bcc ? `Bcc: ${bcc}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    body,
  ]
    .filter(Boolean)
    .join('\r\n');

  return headers;
}
