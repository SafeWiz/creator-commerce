import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight, DollarSign, ShoppingBag, Users } from "lucide-react";

const stats = [
  {
    title: "Revenue",
    value: "$48,120",
    delta: "+12.4%",
    icon: DollarSign,
  },
  {
    title: "Orders",
    value: "1,284",
    delta: "+4.1%",
    icon: ShoppingBag,
  },
  {
    title: "Customers",
    value: "3,910",
    delta: "+8.7%",
    icon: Users,
  },
];

const recentOrders = [
  { id: "#1042", customer: "Ada Lovelace", total: "$120.00", status: "Paid" },
  { id: "#1041", customer: "Alan Turing", total: "$89.50", status: "Paid" },
  { id: "#1040", customer: "Grace Hopper", total: "$240.00", status: "Refunded" },
  { id: "#1039", customer: "Katherine Johnson", total: "$56.00", status: "Pending" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  Paid: "default",
  Pending: "secondary",
  Refunded: "destructive",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your store performance.
          </p>
        </div>
        <Button>
          New product
          <ArrowUpRight />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="text-2xl">{stat.value}</CardTitle>
              <CardAction>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{stat.delta}</Badge>
              <span className="ml-2 text-xs text-muted-foreground">
                vs last month
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Latest transactions from your store.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {recentOrders.map((order, i) => (
            <div key={order.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{order.customer}</span>
                  <span className="text-xs text-muted-foreground">
                    {order.id}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={statusVariant[order.status]}>
                    {order.status}
                  </Badge>
                  <span className="w-20 text-right font-medium tabular-nums">
                    {order.total}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            View all orders
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
