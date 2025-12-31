import {
  Utensils,
  CheckCircle2,
  Clock,
  Package,
  Heart,
  Users,
  MapPin,
  Calendar,
  Eye,
  Bell,
  Inbox,
  User,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDonations, DonationResponse, acceptDonation, completeDonation, rejectDonation } from "@/services/donationService";
import { format, isToday } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { DonationDetailsDialog } from "./DonationDetailsDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const statusStyles = {
  "Pending": "bg-warning/10 text-warning border-warning/20",
  "In Process": "bg-info/10 text-info border-info/20",
  "Completed": "bg-success/10 text-success border-success/20",
  "Rejected": "bg-destructive/10 text-destructive border-destructive/20",
};

const foodTypeEmojis: Record<string, string> = {
  cooked: "🍛",
  raw: "🥬",
  packaged: "📦",
  beverages: "🥤",
  bakery: "🍞",
  dairy: "🥛",
};

export function RecipientDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDonation, setSelectedDonation] = useState<DonationResponse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectingDonation, setRejectingDonation] = useState<DonationResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedDisposalPartner, setSelectedDisposalPartner] = useState<any>(null);

  // Disposal partners list
  const disposalPartners = [
    {
      name: "West Bengal Waste Management Limited (WBWML)",
      contact: "+91-33-2289-3088",
      location: "Kolkata – Park Circus / Haldia"
    },
    {
      name: "Medicare Environmental Management Pvt. Ltd.",
      contact: "+91-33-2289-3088",
      location: "Howrah – Belgachia"
    },
    {
      name: "Green Tech Environ Management Pvt. Ltd.",
      contact: "+91-33-2534-1121",
      location: "Lake Town – Near Salt Lake"
    },
    {
      name: "Re Sustainability Limited (C&D Waste Plant)",
      contact: "+91-40-2444-6000",
      location: "New Town – Action Area III"
    },
    {
      name: "Eco Age Recycling",
      contact: "+91-90387-21515",
      location: "Kolkata – Rafi Ahmed Kidwai Road"
    }
  ];

  const handleViewDetails = (donation: DonationResponse) => {
    setSelectedDonation(donation);
    setIsDialogOpen(true);
  };

  const handleOpenRejectDialog = (donation: DonationResponse) => {
    setRejectingDonation(donation);
    setIsRejectDialogOpen(true);
    setRejectionReason("");
    setSelectedDisposalPartner(null);
  };

  // Accept donation mutation
  const acceptMutation = useMutation({
    mutationFn: acceptDonation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast({
        title: "Donation Accepted! ✅",
        description: "You can now pick up this donation.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete donation mutation
  const completeMutation = useMutation({
    mutationFn: completeDonation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast({
        title: "Donation Completed! 🎉",
        description: "Thank you for confirming receipt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Complete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject donation mutation
  const rejectMutation = useMutation({
    mutationFn: ({ donationId, reason, disposalPartner }: { donationId: string; reason: string; disposalPartner: any }) =>
      rejectDonation(donationId, reason, disposalPartner),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      setIsRejectDialogOpen(false);
      setRejectingDonation(null);
      setRejectionReason("");
      setSelectedDisposalPartner(null);
      toast({
        title: "Donation Marked as Waste ⚠️",
        description: "Disposal partner has been assigned.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAccept = (donationId: string) => {
    acceptMutation.mutate(donationId);
  };

  const handleComplete = (donationId: string) => {
    completeMutation.mutate(donationId);
  };

  const handleReject = () => {
    if (!rejectingDonation || !rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedDisposalPartner) {
      toast({
        title: "Disposal Partner Required",
        description: "Please select a disposal partner.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({
      donationId: rejectingDonation._id,
      reason: rejectionReason,
      disposalPartner: selectedDisposalPartner,
    });
  };

  // Fetch all donations from backend
  const { data: donationsData, isLoading, error } = useQuery({
    queryKey: ["donations"],
    queryFn: getDonations,
  });

  const allDonations = donationsData?.data || [];

  // Filter out completed and rejected donations (only show active donations)
  const activeDonations = allDonations.filter((d: DonationResponse) =>
    d.status !== "Completed" && d.status !== "Rejected"
  );

  // Filter donations for today's pickups (from active donations only)
  const todayPickups = activeDonations.filter((d: DonationResponse) =>
    isToday(new Date(d.pickupDate))
  );

  // Calculate stats (using active donations only)
  const totalDonations = activeDonations.length;
  const totalMeals = activeDonations.reduce((sum: number, d: DonationResponse) => sum + d.quantity, 0);
  const peopleFed = Math.floor(totalMeals / 4);
  const thisMonth = activeDonations.filter((d: DonationResponse) => {
    const donationDate = new Date(d.createdAt);
    const now = new Date();
    return donationDate.getMonth() === now.getMonth() &&
      donationDate.getFullYear() === now.getFullYear();
  }).length;

  const recipientStats = [
    { label: "Meals Available", value: totalMeals.toString(), icon: Utensils, color: "success" },
    { label: "People Can Feed", value: peopleFed.toString(), icon: Users, color: "accent" },
    { label: "Total Donations", value: totalDonations.toString(), icon: Package, color: "primary" },
    { label: "This Month", value: thisMonth.toString(), icon: Heart, color: "info" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Welcome, {userProfile?.name || 'Recipient'}! 👋</h2>
          <p className="text-muted-foreground">View donations sent by donors and track deliveries.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {recipientStats.map((stat, index) => (
          <Card key={stat.label} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-${stat.color}/10`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Pickups Alert */}
      {todayPickups.length > 0 && (
        <Card className="bg-gradient-to-r from-accent/5 to-warning/5 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-accent/10">
                <Bell className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Available for Pickup Today
                  <Badge className="bg-accent text-accent-foreground">{todayPickups.length}</Badge>
                </h3>
                <div className="mt-3 space-y-2">
                  {todayPickups.slice(0, 3).map((donation: DonationResponse) => (
                    <div
                      key={donation._id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetails(donation)}
                    >
                      <div>
                        <p className="font-medium">{donation.name} • {donation.quantity} servings</p>
                        <p className="text-sm text-muted-foreground">
                          {donation.address.split(',')[0]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(donation.pickupTime), "h:mm a")}
                        </p>
                        <Badge variant="outline" className={statusStyles["Available"]}>
                          Available
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Available Donations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Available Donations</CardTitle>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : allDonations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-secondary/50 mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No donations available</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                There are no donations available at the moment. Check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allDonations.slice(0, 10).map((donation: DonationResponse) => (
                <div
                  key={donation._id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex items-center justify-center">
                    {donation.picture ? (
                      <img
                        src={donation.picture}
                        alt={donation.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">
                        {foodTypeEmojis[donation.foodType] || "🍽️"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{donation.name}</p>
                      <Badge variant="outline" className={statusStyles[donation.status]}>
                        {donation.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {donation.quantity} servings{donation.foodType ? ` • ${donation.foodType}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {donation.address.split(',').slice(0, 2).join(',')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(donation.pickupDate), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(donation.pickupTime), "h:mm a")}
                    </p>
                    <div className="flex gap-2">
                      {/* Accept button - only show if status is Pending */}
                      {donation.status === "Pending" && (
                        <Button
                          size="sm"
                          className="h-7 px-3 bg-success hover:bg-success/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(donation._id);
                          }}
                          disabled={acceptMutation.isPending}
                        >
                          {acceptMutation.isPending ? "Accepting..." : "Accept"}
                        </Button>
                      )}
                      {/* Complete button - only show if status is In Process and user accepted it */}
                      {donation.status === "In Process" &&
                        typeof donation.acceptedBy === 'object' &&
                        donation.acceptedBy?.uid === userProfile?.uid && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 px-3 bg-primary hover:bg-primary/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(donation._id);
                              }}
                              disabled={completeMutation.isPending}
                            >
                              {completeMutation.isPending ? "Completing..." : "Mark Received"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRejectDialog(donation);
                              }}
                              disabled={rejectMutation.isPending}
                            >
                              Mark as Waste
                            </Button>
                          </>
                        )}
                      {/* View details button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleViewDetails(donation)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Track Deliveries", icon: MapPin, to: "/request-dashboard", color: "info" },
          { label: "Profile", icon: User, to: "/profile", color: "accent" },
          { label: "Our Impact", icon: Heart, to: "/request-dashboard", color: "success" },
          { label: "History", icon: Clock, to: "/request-dashboard", color: "primary" },
        ].map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-${action.color}/50 hover:shadow-soft transition-all`}
          >
            <action.icon className={`h-6 w-6 text-${action.color}`} />
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Donation Details Dialog */}
      <DonationDetailsDialog
        donation={selectedDonation}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {/* Rejection Reason Dialog */}
      {isRejectDialogOpen && rejectingDonation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setIsRejectDialogOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div
            className="relative bg-card rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4 text-destructive">
              Mark Donation as Waste
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for marking this donation as unsafe or wasted, and select a disposal partner.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectionReason">Reason for Rejection *</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="e.g., Food spoiled, unsafe to consume, damaged packaging..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="mb-3 block">Select Disposal Partner *</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {disposalPartners.map((partner, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-3 border cursor-pointer transition-all ${selectedDisposalPartner?.name === partner.name
                        ? 'bg-destructive/10 border-destructive ring-2 ring-destructive/20'
                        : 'bg-secondary/30 border-border hover:border-destructive/30'
                        }`}
                      onClick={() => setSelectedDisposalPartner(partner)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedDisposalPartner?.name === partner.name
                            ? 'border-destructive bg-destructive'
                            : 'border-muted-foreground'
                            }`}>
                            {selectedDisposalPartner?.name === partner.name && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{partner.name}</h4>
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {partner.contact}
                            </p>
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {partner.location}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsRejectDialogOpen(false)}
                  disabled={rejectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending || !rejectionReason.trim() || !selectedDisposalPartner}
                >
                  {rejectMutation.isPending ? "Submitting..." : "Mark as Waste"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}