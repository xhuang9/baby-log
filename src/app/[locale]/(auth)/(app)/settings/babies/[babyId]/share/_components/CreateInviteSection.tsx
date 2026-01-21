'use client';

import { Mail, QrCode } from 'lucide-react';
import { useState } from 'react';
import { createEmailInvite, createPasskeyInvite } from '@/actions/babyActions';
import { EmailInviteLinkModal } from './EmailInviteLinkModal';
import { PasskeyCodeModal } from './PasskeyCodeModal';

type CreateInviteSectionProps = {
  babyId: number;
  babyName: string;
};

export function CreateInviteSection({ babyId, babyName }: CreateInviteSectionProps) {
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePasskey = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await createPasskeyInvite({ babyId });

      if (!result.success) {
        setError(result.error);
        setIsGenerating(false);
        return;
      }

      setGeneratedCode(result.code);
      setExpiresAt(result.expiresAt);
      setShowPasskeyModal(true);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    }
    finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const result = await createEmailInvite({ babyId, invitedEmail: email });

      if (!result.success) {
        setError(result.error);
        setIsGenerating(false);
        return;
      }

      setGeneratedLink(result.inviteLink);
      setExpiresAt(result.expiresAt);
      setEmail('');
      setShowEmailModal(false);
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite link');
    }
    finally {
      setIsGenerating(false);
    }
  };

  const handleClosePasskeyModal = () => {
    setShowPasskeyModal(false);
    setGeneratedCode(null);
    setExpiresAt(null);
  };

  const handleCloseEmailModal = () => {
    setShowEmailModal(false);
    setError(null);
  };

  const handleCloseLinkModal = () => {
    setGeneratedLink(null);
    setExpiresAt(null);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Create Invite</h2>
        <p className="text-sm text-muted-foreground">
          Share access to {babyName} with caregivers
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Passkey Option */}
        <button
          type="button"
          onClick={handleGeneratePasskey}
          disabled={isGenerating}
          className="group flex flex-col items-start gap-3 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">6-Digit Code</h3>
              <p className="text-xs text-muted-foreground">Quick & simple</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate a temporary code that expires in 1 hour. Perfect for in-person sharing.
          </p>
        </button>

        {/* Email Option */}
        <button
          type="button"
          onClick={() => setShowEmailModal(true)}
          disabled={isGenerating}
          className="group flex flex-col items-start gap-3 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Email Invite</h3>
              <p className="text-xs text-muted-foreground">Secure link</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Send a personalized invite link that expires in 24 hours.
          </p>
        </button>
      </div>

      {/* Passkey Modal */}
      {showPasskeyModal && generatedCode && expiresAt && (
        <PasskeyCodeModal
          code={generatedCode}
          expiresAt={expiresAt}
          onClose={handleClosePasskeyModal}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-background p-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Create Email Invite</h3>
              <p className="text-sm text-muted-foreground">
                Enter the email address of the person you want to invite.
              </p>
            </div>

            <form onSubmit={handleGenerateEmailInvite} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  placeholder="caregiver@example.com"
                  required
                  disabled={isGenerating}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Link'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseEmailModal}
                  disabled={isGenerating}
                  className="rounded-md border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Link Modal */}
      {generatedLink && expiresAt && (
        <EmailInviteLinkModal
          inviteLink={generatedLink}
          expiresAt={expiresAt}
          onClose={handleCloseLinkModal}
        />
      )}
    </div>
  );
}
