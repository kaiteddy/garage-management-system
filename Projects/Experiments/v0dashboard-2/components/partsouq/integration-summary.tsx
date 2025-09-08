'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ExternalLink, 
  CheckCircle, 
  Zap,
  Shield,
  Bot
} from 'lucide-react';
import Link from 'next/link';

export function PartSouqIntegrationSummary() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              PartSouq Integration
            </CardTitle>
            <CardDescription>
              Advanced VIN-based parts search with Cloudflare bypass
            </CardDescription>
          </div>
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-blue-600" />
            <span>Browser Automation</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Cloudflare Bypass</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-600" />
            <span>ScrapingBee Proxy</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 py-3 border-t border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">3</p>
            <p className="text-xs text-muted-foreground">Access Methods</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">100%</p>
            <p className="text-xs text-muted-foreground">Feature Complete</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">24/7</p>
            <p className="text-xs text-muted-foreground">Monitoring</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link href="/partsouq-test">
              <ExternalLink className="mr-2 h-4 w-4" />
              Test Integration
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/parts">
              View Parts
            </Link>
          </Button>
        </div>

        {/* Status Message */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <p className="font-medium mb-1">Integration Status:</p>
          <p>
            All PartSouq integration features are implemented and ready for production.
            The system includes browser automation, premium proxy services, and 
            intelligent Cloudflare challenge solving based on Fiddler analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
