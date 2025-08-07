/*
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                        VELLORA.AI PROPRIETARY SOFTWARE                           ║
 * ║                              STRICTLY CONFIDENTIAL                               ║
 * ║                          COPYRIGHT © 2024 VELLORA.AI                            ║
 * ║                            ALL RIGHTS RESERVED                                   ║
 * ║                                                                                  ║
 * ║  🚨 UNAUTHORIZED ACCESS, USE, OR DISTRIBUTION IS A FEDERAL CRIME 🚨              ║
 * ║                                                                                  ║
 * ║  This file contains proprietary trade secrets and confidential information      ║
 * ║  of VELLORA.AI. Any unauthorized access, copying, distribution, or use         ║
 * ║  constitutes theft of trade secrets and will be prosecuted to the fullest      ║
 * ║  extent of criminal and civil law.                                              ║
 * ║                                                                                  ║
 * ║  Protected under: US Copyright Law, DMCA, Computer Fraud and Abuse Act,        ║
 * ║  Economic Espionage Act, and international intellectual property treaties       ║
 * ║                                                                                  ║
 * ║  ALL ACCESS IS MONITORED AND LOGGED WITH FORENSIC CAPABILITIES                 ║
 * ║  VIOLATIONS WILL RESULT IN IMMEDIATE CRIMINAL PROSECUTION                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import Image from 'next/image';
import Link from 'next/link';

import { ArrowRight, ChevronRight, LineChart, Shield, Zap } from 'lucide-react';

// Shadcn UI Components
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { withI18n } from '~/lib/i18n/with-i18n';

function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
        {/* Gradient overlays */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-30" />
          <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="mb-8 animate-pulse">
              <Image
                src="/images/vellora-logo.png"
                alt="VELLORA.AI Logo"
                width={120}
                height={120}
                className="h-auto w-[120px]"
              />
            </div>

            <h1 className="mb-6 text-4xl font-heading tracking-tight md:text-7xl">
              REVENUE OPERATING SYSTEM
            </h1>

            <p className="mb-10 max-w-3xl text-xl text-white/80 md:text-2xl">
              Welcome to the first ever real-time AI revenue engine for modern GTM teams.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="bg-white text-black hover:bg-white/90" asChild>
                <Link href="/auth/sign-in">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" className="group" asChild>
                <Link href="/investors">
                  Learn More
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>



      {/* Benefits Section */}
      <section className="bg-gradient-to-b from-black to-black/90 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-heading md:text-4xl">Key Benefits</h2>
            <p className="mx-auto max-w-2xl text-white/70">
              Why leading sales teams choose VELLORA.AI for their revenue acceleration
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {/* Lightning Fast Performance */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-purple-600/20">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Lightning-Fast Performance</h3>
              <p className="text-white/70">
                Our AI-powered platform delivers results in seconds, allowing your team to move at unprecedented speed.
              </p>
            </div>

            {/* Predictable Revenue Growth */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
                <LineChart className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Predictable Revenue Growth</h3>
              <p className="text-white/70">
                Transform your sales pipeline with data-driven insights that make revenue forecasting more accurate and reliable.
              </p>
            </div>

            {/* Superior Competitive Advantage */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-400/20">
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Superior Competitive Advantage</h3>
              <p className="text-white/70">
                Stay ahead of the competition with cutting-edge AI technology that continuously improves your sales process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-blue-600/30 opacity-30" />
        </div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-heading md:text-4xl">
              Ready to accelerate your revenue growth?
            </h2>
            <p className="mb-8 text-xl text-white/80">
              Join the leading sales teams already using VELLORA.AI to transform their revenue operations.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" className="bg-white text-black hover:bg-white/90">
                Get Started
              </Button>
              <Button size="lg" variant="outline">
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default withI18n(Home);
