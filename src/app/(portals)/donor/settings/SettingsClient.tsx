"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Bell, AlertTriangle, ShieldCheck } from "lucide-react";
import { Profile, DonorProfile } from "@/types/database";
import { deactivateDonorAccountAction } from "@/actions";
import { Button, Card, ConfirmDialog } from "@/components/ui";

interface SettingsClientProps {
  user: Profile;
  donorProfile: DonorProfile;
}

export function SettingsClient({ user, donorProfile }: SettingsClientProps) {
  const router = useRouter();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [smsUrgentEnabled, setSmsUrgentEnabled] = useState(true);

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setErrorMessage(null);

    const res = await deactivateDonorAccountAction();
    setIsDeactivating(false);

    if (res.success) {
      router.push("/donor/login?message=account_deactivated");
    } else {
      setErrorMessage(res.error || "Failed to deactivate account.");
      setShowDeactivateDialog(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Account Info */}
      <Card className="p-6 space-y-4 bg-white border-slate-200">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <User className="w-5 h-5 text-blood-600" />
          <span>Account Information</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm font-inter">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Full Name
            </span>
            <span className="text-dark">{user.full_name || "Hero Donor"}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Email Address
            </span>
            <span className="font-medium text-dark">{user.email}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Phone Number
            </span>
            <span className="font-medium text-dark">{user.phone || "Not set"}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Registered Blood Group
            </span>
            <span className="font-bold text-blood-600">{donorProfile.blood_group}</span>
          </div>
        </div>

        <div className="pt-2">
          <Link href="/donor/profile">
            <Button variant="outline" size="sm" className="text-xs">
              Edit Profile Details
            </Button>
          </Link>
        </div>
      </Card>

      {/* Security & Password */}
      <Card className="p-6 space-y-4 bg-white border-slate-200">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <Lock className="w-5 h-5 text-secondary-600" />
          <span>Security & Password</span>
        </h3>

        <p className="text-xs text-slate-600 font-inter leading-relaxed">
          Ensure your account uses a strong password. You can reset or update your password anytime.
        </p>

        <Link href="/donor/reset-password">
          <Button variant="outline" size="sm" className="text-xs">
            Change Password
          </Button>
        </Link>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6 space-y-4 bg-white border-slate-200">
        <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-600" />
          <span>Notification Preferences</span>
        </h3>

        <div className="space-y-3 text-xs sm:text-sm font-inter">
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <div>
              <span className="text-dark block">Emergency Blood Request Alerts</span>
              <span className="text-xs text-slate-500">
                Receive instant notifications when an urgent match occurs in your area.
              </span>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="w-4 h-4 text-blood-600 rounded-md focus:ring-blood-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
            <div>
              <span className="text-dark block">SMS Emergency Dispatches</span>
              <span className="text-xs text-slate-500">
                Receive urgent SMS dispatches when hospitals broadcast Level-1 emergency requests.
              </span>
            </div>
            <input
              type="checkbox"
              checked={smsUrgentEnabled}
              onChange={(e) => setSmsUrgentEnabled(e.target.checked)}
              className="w-4 h-4 text-blood-600 rounded-md focus:ring-blood-500"
            />
          </label>
        </div>
      </Card>

      {/* Danger Zone: Account Deactivation */}
      <Card className="p-6 space-y-4 bg-red-50/40 border-red-200">
        <h3 className="font-poppins font-bold text-base text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span>Deactivate Account</span>
        </h3>

        <p className="text-xs text-slate-600 font-inter leading-relaxed">
          Deactivating your account will pause all matching notifications and set your readiness to unavailable. Your past donation records will remain securely archived for clinical verification.
        </p>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowDeactivateDialog(true)}
          className="text-xs"
        >
          Deactivate Donor Account
        </Button>
      </Card>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        isOpen={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Donor Account?"
        message="Are you sure you want to deactivate your donor account? You will stop receiving blood matching notifications until you sign in again."
        confirmText="Yes, Deactivate"
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
}
