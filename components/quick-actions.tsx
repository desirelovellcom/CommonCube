"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Download, Smartphone, Users, Plus, ArrowUpDown } from "lucide-react"
import { SendMoneyDialog } from "@/components/send-money-dialog"
import { ReceiveMoneyDialog } from "@/components/receive-money-dialog"

interface QuickActionsProps {
  wallet: any
  isOnline: boolean
}

export function QuickActions({ wallet, isOnline }: QuickActionsProps) {
  const actions = [
    {
      icon: Send,
      label: "Send",
      description: "Transfer money",
      color: "bg-primary text-primary-foreground",
      disabled: false,
      component: SendMoneyDialog,
    },
    {
      icon: Download,
      label: "Receive",
      description: "Get paid",
      color: "bg-success text-success-foreground",
      disabled: false,
      component: ReceiveMoneyDialog,
    },
    {
      icon: ArrowUpDown,
      label: "Exchange",
      description: "Convert currency",
      color: "bg-accent text-accent-foreground",
      disabled: !isOnline,
    },
    {
      icon: Smartphone,
      label: "Top Up",
      description: "Add airtime",
      color: "bg-warning text-warning-foreground",
      disabled: !isOnline,
    },
    {
      icon: Users,
      label: "Split Bill",
      description: "Share expenses",
      color: "bg-secondary text-secondary-foreground",
      disabled: false,
    },
    {
      icon: Plus,
      label: "More",
      description: "Other services",
      color: "bg-muted text-muted-foreground",
      disabled: false,
    },
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon
            const ActionComponent = action.component

            if (ActionComponent) {
              return (
                <ActionComponent key={index} wallet={wallet} isOnline={isOnline}>
                  <Button
                    variant="ghost"
                    className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50 disabled:opacity-50"
                    disabled={action.disabled}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-sm">{action.label}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Button>
                </ActionComponent>
              )
            }

            return (
              <Button
                key={index}
                variant="ghost"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50 disabled:opacity-50"
                disabled={action.disabled}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
