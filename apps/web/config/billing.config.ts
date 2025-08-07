/*
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                        VELLORA.AI PROPRIETARY SOFTWARE                           ║
 * ║                              STRICTLY CONFIDENTIAL                               ║
 * ║                          COPYRIGHT © 2024 VELLORA.AI                            ║
 * ║                            ALL RIGHTS RESERVED                                   ║
 * ║                                                                                  ║
 * ║  🚨 UNAUTHORIZED ACCESS, USE, OR DISTRIBUTION IS A FEDERAL CRIME 🚨              ║
 * ║                                                                                  ║
 * ║  DAMAGES: $1,000,000,000 PER VIOLATION + CRIMINAL PROSECUTION                  ║
 * ║  Protected under: US Copyright Law, DMCA, Computer Fraud and Abuse Act,        ║
 * ║  Economic Espionage Act, and international intellectual property treaties       ║
 * ║                                                                                  ║
 * ║  ALL ACCESS IS MONITORED AND LOGGED WITH FORENSIC CAPABILITIES                 ║
 * ║  VIOLATIONS WILL RESULT IN IMMEDIATE CRIMINAL PROSECUTION                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { BillingProviderSchema, createBillingSchema } from '@kit/billing';

// The billing provider to use. This should be set in the environment variables
const provider = BillingProviderSchema.parse(
  process.env.NEXT_PUBLIC_BILLING_PROVIDER,
);

export default createBillingSchema({
  provider,
  products: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for growing sales teams',
      currency: 'USD',
      badge: 'Popular',
      plans: [
        {
          name: 'Starter Monthly',
          id: 'starter-monthly',
          paymentType: 'recurring',
          interval: 'month',
          lineItems: [
            {
              id: 'starter-monthly-base',
              name: 'Starter Plan',
              cost: 35,
              type: 'per_seat' as const,
            },
          ],
        },
      ],
      features: [
        'AI-Powered Deal Flow Management',
        'Real-Time Momentum Tracking',
        'Automated Meeting Analysis',
        'Revenue Pipeline Insights',
        'Deal Stage Automation',
        'Contact & Company Management',
        'Email Integration & Analysis', 
        'Performance Analytics Dashboard',
        'Mobile Access',
        'CRM Integrations'
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Advanced features for scaling teams',
      currency: 'USD',
      badge: 'Best Value',
      plans: [
        {
          name: 'Pro Monthly',
          id: 'pro-monthly',
          paymentType: 'recurring',
          interval: 'month',
          lineItems: [
            {
              id: 'pro-monthly-base',
              name: 'Pro Plan',
              cost: 50,
              type: 'per_seat' as const,
            },
          ],
        },
      ],
      features: [
        'AI-Powered Deal Flow Management',
        'Real-Time Momentum Tracking',
        'Automated Meeting Analysis',
        'Revenue Pipeline Insights',
        'Deal Stage Automation',
        'Contact & Company Management',
        'Email Integration & Analysis', 
        'Performance Analytics Dashboard',
        'Mobile Access',
        'CRM Integrations',
        'Dedicated Account Support',
        'Priority Feature Requests',
        'Faster AI Completions'
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      currency: 'USD',
      badge: 'Contact Us',
      plans: [
        {
          name: 'Enterprise',
          id: 'enterprise-custom',
          paymentType: 'one-time',
          lineItems: [
            {
              id: 'enterprise-custom-base',
              name: 'Enterprise Plan',
              cost: 0, // Contact us pricing
              type: 'flat' as const,
            },
          ],
        },
      ],
      features: [
        'AI-Powered Deal Flow Management',
        'Real-Time Momentum Tracking',
        'Automated Meeting Analysis',
        'Revenue Pipeline Insights',
        'Deal Stage Automation',
        'Contact & Company Management',
        'Email Integration & Analysis', 
        'Performance Analytics Dashboard',
        'Mobile Access',
        'CRM Integrations',
        'White Glove Support',
        'Dedicated Account Manager',
        'Complex Integrations and Workflows'
      ],
    },
  ],
});
