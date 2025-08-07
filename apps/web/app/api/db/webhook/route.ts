import { getDatabaseWebhookHandlerService } from '@kit/database-webhooks';
import { getLogger } from '@kit/shared/logger';
import { getServerMonitoringService } from '@kit/monitoring/server';
import { enhanceRouteHandler } from '@kit/next/routes';

/**
 * @name POST
 * @description POST handler for the webhook route that handles the webhook event
 * Enhanced with production security and extensive debugging
 */
export const POST = enhanceRouteHandler(
  async ({ request }) => {
    const logger = await getLogger();
    const service = getDatabaseWebhookHandlerService();

    try {
      // 🚨 ENHANCED DEBUGGING: Log ALL incoming webhook requests
      console.log('🔔 WEBHOOK REQUEST RECEIVED', {
        url: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      });

      logger.info('🔔 WEBHOOK REQUEST RECEIVED', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        timestamp: new Date().toISOString(),
      });

      const signature = request.headers.get('X-Supabase-Event-Signature');
      const expectedSignature = process.env.SUPABASE_WEBHOOK_SECRET || 'WEBHOOKSECRET';

      // 🚨 ENHANCED DEBUGGING: Log signature details
      console.log('🔐 SIGNATURE CHECK', {
        hasSignature: !!signature,
        signaturesMatch: signature === expectedSignature,
        nodeEnv: process.env.NODE_ENV,
      });

      logger.info('🔐 SIGNATURE VALIDATION', {
        hasSignature: !!signature,
        signatureLength: signature?.length || 0,
        signaturePreview: signature ? signature.substring(0, 10) + '...' : 'none',
        expectedLength: expectedSignature.length,
        expectedPreview: expectedSignature.substring(0, 10) + '...',
        nodeEnv: process.env.NODE_ENV,
        signaturesMatch: signature === expectedSignature,
      });

      // Enhanced signature validation
      if (!signature) {
        console.log('❌ Missing signature header');
        logger.warn('❌ Webhook request missing signature header');
        return new Response('Missing signature', { status: 400 });
      }

      // Validate signature for production security
      if (process.env.NODE_ENV === 'production' && signature !== expectedSignature) {
        console.log('❌ Signature validation failed');
        logger.error('❌ Webhook signature validation failed', {
          providedSignature: signature.substring(0, 10) + '...',
          expectedLength: expectedSignature.length,
        });
        return new Response('Invalid signature', { status: 401 });
      }

      // 🚨 ENHANCED DEBUGGING: Environment check
      const envCheck = {
        NODE_ENV: process.env.NODE_ENV,
        MAILER_PROVIDER: process.env.MAILER_PROVIDER || 'nodemailer (default)',
        EMAIL_SENDER: process.env.EMAIL_SENDER ? 'SET' : 'NOT SET',
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? 'SET' : 'NOT SET',
        NEXT_PUBLIC_PRODUCT_NAME: process.env.NEXT_PUBLIC_PRODUCT_NAME ? 'SET' : 'NOT SET',
        SUPABASE_WEBHOOK_SECRET: process.env.SUPABASE_WEBHOOK_SECRET ? 'SET' : 'NOT SET',
        // Email provider specific vars
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
        EMAIL_HOST: process.env.EMAIL_HOST ? 'SET' : 'NOT SET',
        EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET',
      };

      console.log('🌍 EMAIL ENVIRONMENT CHECK', envCheck);
      logger.info('🌍 EMAIL ENVIRONMENT CHECK', envCheck);

      const body = await request.clone().json();

      // 🚨 ENHANCED DEBUGGING: Log webhook payload
      console.log('�� WEBHOOK PAYLOAD', {
        table: body.table,
        type: body.type,
        recordEmail: body.record?.email,
        recordId: body.record?.id,
        recordToken: body.record?.invite_token,
      });

      logger.info('📦 WEBHOOK PAYLOAD', {
        table: body.table,
        type: body.type,
        schema: body.schema,
        record: body.record ? {
          id: body.record.id,
          email: body.record.email,
          inviteToken: body.record.invite_token,
          accountId: body.record.account_id,
          createdAt: body.record.created_at,
          role: body.record.role,
          invitedBy: body.record.invited_by,
        } : null,
        oldRecord: body.old_record,
        fullBody: body,
        bodySize: JSON.stringify(body).length,
      });

      // 🚨 ENHANCED DEBUGGING: Check if invitation webhook
      if (body.table === 'invitations' && body.type === 'INSERT') {
        console.log('🎯 INVITATION WEBHOOK DETECTED!', {
          email: body.record?.email,
          inviteToken: body.record?.invite_token,
          accountId: body.record?.account_id,
          role: body.record?.role,
        });
        logger.info('🎯 INVITATION WEBHOOK DETECTED!', {
          invitedEmail: body.record?.email,
          inviteToken: body.record?.invite_token,
          accountId: body.record?.account_id,
          role: body.record?.role,
        });
      } else {
        console.log('ℹ️ Non-invitation webhook received', {
          table: body.table,
          type: body.type,
        });
        logger.info('ℹ️ Non-invitation webhook received', {
          table: body.table,
          type: body.type,
        });
      }

      console.log('🔄 Calling webhook handler service...');
      logger.info('🔄 Processing webhook event', {
        eventType: body.table ? `${body.table}.${body.type}` : 'unknown',
        hasSignature: !!signature,
        timestamp: new Date().toISOString(),
      });

      // 🚨 ENHANCED DEBUGGING: Before calling service
      console.log('🎯 About to call service.handleWebhook...');
      logger.info('🎯 Calling webhook handler service...');

      // handle the webhook event
      await service.handleWebhook({
        body,
        signature,
      });

      console.log('✅ WEBHOOK PROCESSED SUCCESSFULLY');
      logger.info('✅ WEBHOOK PROCESSED SUCCESSFULLY', {
        eventType: body.table ? `${body.table}.${body.type}` : 'unknown',
        timestamp: new Date().toISOString(),
        message: 'Email should have been sent if this was an invitation webhook',
      });

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error('❌ WEBHOOK ERROR:', error);
      logger.error('❌ WEBHOOK PROCESSING FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        url: request.url,
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      });

      const monitoringService = await getServerMonitoringService();
      await monitoringService.ready();
      await monitoringService.captureException(error as Error);

      return new Response(null, { status: 500 });
    }
  },
  {
    auth: false,
  },
);
