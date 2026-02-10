import { useState } from 'react';
import {
  ShieldCheck,
  Database,
  CreditCard,
  Activity,
  Globe,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import type { HealthCheckResult, ServiceStatus, ServiceStatusType } from '../lib/health-checks';

interface HealthDashboardProps {
  initialStatus: HealthCheckResult;
}

interface RevealedSecrets {
  [key: string]: {
    value: string;
    timer?: number;
  };
}

export default function HealthDashboard({ initialStatus }: HealthDashboardProps) {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult>(initialStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<RevealedSecrets>({});

  // Service icon mapping
  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'clerk': return ShieldCheck;
      case 'convex': return Database;
      case 'stripe': return CreditCard;
      case 'vercel': return Activity;
      case 'live site': return Globe;
      default: return Activity;
    }
  };

  // Service color mapping
  const getServiceColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'clerk': return 'purple';
      case 'convex': return 'orange';
      case 'stripe': return 'blue';
      case 'vercel': return 'red';
      case 'live site': return 'green';
      default: return 'neutral';
    }
  };

  // Status dot color
  const getStatusColor = (status: ServiceStatusType) => {
    switch (status) {
      case 'connected': return 'green';
      case 'warning': return 'yellow';
      case 'disconnected': return 'red';
      default: return 'gray';
    }
  };

  // Refresh health status
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/admin/health-check');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch (error) {
      console.error('Failed to refresh health status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reveal secret
  const handleRevealSecret = async (service: string, secretType: 'clerk' | 'stripe' | 'stripe-webhook') => {
    const key = `${service}-${secretType}`;

    // If already revealed, hide it
    if (revealedSecrets[key]) {
      if (revealedSecrets[key].timer) {
        clearTimeout(revealedSecrets[key].timer);
      }
      setRevealedSecrets(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/reveal-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: secretType })
      });

      if (response.ok) {
        const data = await response.json();

        // Set auto-hide timer for 10 seconds
        const timer = setTimeout(() => {
          setRevealedSecrets(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 10000);

        setRevealedSecrets(prev => ({
          ...prev,
          [key]: { value: data.secret, timer: timer as unknown as number }
        }));
      }
    } catch (error) {
      console.error('Failed to reveal secret:', error);
    }
  };

  // Overall status badge
  const OverallStatusBadge = () => {
    const status = healthStatus.overallStatus;
    const colors = {
      connected: 'bg-green-500/10 text-green-500 border-green-500/20',
      warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      disconnected: 'bg-red-500/10 text-red-500 border-red-500/20',
      unknown: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    };

    return (
      <div className={`glass-card px-4 py-2 rounded-xl flex items-center gap-3 border ${colors[status]}`}>
        <div className={`w-2 h-2 rounded-full bg-${getStatusColor(status)}-500 ${status !== 'disconnected' ? 'status-pulse' : ''}`}></div>
        <span className="text-xs font-bold uppercase tracking-widest">
          {status === 'connected' ? 'All Systems Operational' : status === 'warning' ? 'Some Warnings' : 'Issues Detected'}
        </span>
      </div>
    );
  };

  // Service card component
  const ServiceCard = ({ service }: { service: ServiceStatus }) => {
    const Icon = getServiceIcon(service.name);
    const color = getServiceColor(service.name);
    const statusColor = getStatusColor(service.status);

    return (
      <div className={`glass-card p-6 rounded-2xl border-l-4 border-l-${color}-500 hover:bg-white/[0.02] transition-colors`}>
        <div className="flex justify-between items-start mb-4">
          <Icon className={`w-6 h-6 text-${color}-500`} />
          <span className={`text-[10px] font-black bg-${color}-500/10 text-${color}-400 px-2 py-1 rounded`}>
            {service.name === 'Clerk' ? 'AUTH' : service.name === 'Convex' ? 'DB' : service.name === 'Stripe' ? 'PAY' : service.name === 'Vercel' ? 'EDGE' : 'SITE'}
          </span>
        </div>

        <h3 className="font-bold text-lg mb-1">{service.name}</h3>
        <p className={`text-xs mb-4 ${service.metadata?.mode === 'Test' ? 'italic text-blue-400' : 'text-neutral-500'}`}>
          {service.message}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <div className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-400 ${service.status === 'connected' ? 'status-pulse' : ''}`}></div>
          <span className={`text-[10px] font-black uppercase text-${statusColor}-400`}>
            {service.status}
          </span>
        </div>

        {service.publicKey && (
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <p className="text-[10px] text-neutral-500 mb-1">PUBLIC KEY</p>
            <code className="text-[10px] text-neutral-300 break-all">{service.publicKey}</code>
          </div>
        )}

        {service.secretKeyMasked && (
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-neutral-500">SECRET KEY</p>
              <button
                onClick={() => handleRevealSecret(service.name, service.name.toLowerCase() as 'clerk' | 'stripe')}
                className="text-[10px] text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                {revealedSecrets[`${service.name}-${service.name.toLowerCase()}`] ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Reveal
                  </>
                )}
              </button>
            </div>
            <code className={`text-[10px] break-all ${
              revealedSecrets[`${service.name}-${service.name.toLowerCase()}`]
                ? 'text-red-400'
                : 'text-neutral-600'
            }`}>
              {revealedSecrets[`${service.name}-${service.name.toLowerCase()}`]?.value || service.secretKeyMasked}
            </code>
          </div>
        )}

        {service.metadata && Object.keys(service.metadata).length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1">
            {Object.entries(service.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center text-[10px]">
                <span className="text-neutral-500 uppercase">{key}</span>
                <span className="text-neutral-300 font-mono">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Environment variables table
  const EnvTable = () => {
    const envVars = [
      { service: 'Clerk', name: 'PUBLIC_CLERK_PUBLISHABLE_KEY', type: 'PUBLIC', value: healthStatus.environment?.PUBLIC_CLERK_PUBLISHABLE_KEY, isSecret: false },
      { service: 'Clerk', name: 'CLERK_SECRET_KEY', type: 'SECRET', value: 'clerk', isSecret: true },
      { service: 'Convex', name: 'PUBLIC_CONVEX_URL', type: 'PUBLIC', value: healthStatus.environment?.PUBLIC_CONVEX_URL, isSecret: false },
      { service: 'Stripe', name: 'STRIPE_SECRET_KEY', type: 'SECRET', value: 'stripe', isSecret: true },
      { service: 'Stripe', name: 'STRIPE_WEBHOOK_SECRET', type: 'SECRET', value: 'stripe-webhook', isSecret: true },
    ];

    return (
      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="bg-neutral-900/50 p-6 border-b border-neutral-800 flex justify-between items-center">
          <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" />
            Environment Variable Manifest
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-[10px] font-black uppercase bg-red-600 px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Variable Name</th>
                <th className="px-6 py-4">Key Type</th>
                <th className="px-6 py-4">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {envVars.map((env, idx) => {
                const revealKey = `${env.service}-${env.value}`;
                const isRevealed = !!revealedSecrets[revealKey];

                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold">{env.service}</td>
                    <td className="px-6 py-4 italic text-neutral-400 underline decoration-red-500/20">
                      {env.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        env.type === 'PUBLIC'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500 uppercase'
                      }`}>
                        {env.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {env.isSecret ? (
                        <div className="flex items-center gap-3">
                          <code className={`${isRevealed ? 'text-red-400' : 'text-red-900 blur-sm select-none'}`}>
                            {isRevealed ? revealedSecrets[revealKey].value : 'sk_test_••••••••••••••••'}
                          </code>
                          <button
                            onClick={() => handleRevealSecret(env.service, env.value as 'clerk' | 'stripe' | 'stripe-webhook')}
                            className="text-[10px] text-red-500 hover:text-red-400 transition-colors"
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      ) : (
                        <code className="text-neutral-300">{env.value}</code>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <OverallStatusBadge />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthStatus.services.map((service, idx) => (
          <ServiceCard key={idx} service={service} />
        ))}
      </div>

      <EnvTable />

      <div className="text-center text-xs text-neutral-600">
        Last updated: {new Date(healthStatus.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
