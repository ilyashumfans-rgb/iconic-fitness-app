import { useGetWallet, getGetWalletQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, Coins, ArrowUpRight, ArrowDownRight, Gift, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Wallet() {
  const { data: wallet, isLoading } = useGetWallet({ query: { queryKey: getGetWalletQueryKey() } });

  const getTransactionIcon = (kind: string) => {
    switch (kind) {
      case 'topup': return <ArrowDownRight className="h-5 w-5 text-green-500" />;
      case 'debit': return <ArrowUpRight className="h-5 w-5 text-red-500" />;
      case 'cashback': return <Coins className="h-5 w-5 text-yellow-500" />;
      case 'referral': return <Gift className="h-5 w-5 text-purple-500" />;
      case 'refund': return <ArrowDownRight className="h-5 w-5 text-blue-500" />;
      default: return <WalletIcon className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Wallet</h1>
        <p className="text-muted-foreground mt-1">Manage balances and rewards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Balance */}
        <Card className="bg-card border-none shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-8 flex flex-col h-full justify-between relative z-10">
            <div>
              <div className="flex items-center text-muted-foreground font-bold text-sm uppercase tracking-wider mb-2">
                <WalletIcon className="h-4 w-4 mr-2" /> Balance
              </div>
              {isLoading ? (
                <Skeleton className="h-14 w-40" />
              ) : (
                <div className="text-5xl font-black">₹{wallet?.balanceInr.toLocaleString()}</div>
              )}
            </div>
            <div className="mt-8 flex gap-3">
              <Button className="flex-1 font-bold"><Plus className="h-4 w-4 mr-2" /> Add Money</Button>
            </div>
          </CardContent>
        </Card>

        {/* Reward Points */}
        <Card className="bg-card border-none shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-8 flex flex-col h-full justify-between relative z-10">
            <div>
              <div className="flex items-center text-muted-foreground font-bold text-sm uppercase tracking-wider mb-2">
                <Coins className="h-4 w-4 mr-2 text-yellow-500" /> Reward Points
              </div>
              {isLoading ? (
                <Skeleton className="h-14 w-32" />
              ) : (
                <div className="text-5xl font-black text-yellow-500">{wallet?.rewardPoints.toLocaleString()}</div>
              )}
            </div>
            <div className="mt-8">
              <Button variant="outline" className="w-full font-bold">Redeem Points</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <section>
        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : wallet?.transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
              <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No transactions yet</p>
            </div>
          ) : wallet?.transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  {getTransactionIcon(tx.kind)}
                </div>
                <div>
                  <div className="font-bold">{tx.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}
                  </div>
                </div>
              </div>
              <div className={`font-black text-lg ${tx.amountInr > 0 ? 'text-green-500' : ''}`}>
                {tx.amountInr > 0 ? '+' : ''}₹{Math.abs(tx.amountInr)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
