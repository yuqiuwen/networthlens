import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";

import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/investments")({
  head: () => ({
    meta: [
      { title: "投资持仓 · Finora" },
      {
        name: "description",
        content: "投资持仓模块正在开发中：基金、股票、债券持仓的成本、市值与收益率统一视图。",
      },
    ],
  }),
  component: InvestmentsPage,
});

function InvestmentsPage() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="投资持仓"
      description="把基金、股票、债券的持仓与成本集中登记，让投资成为资产结构的一部分。"
      highlights={[
        "基金 / 股票 / 债券持仓统一登记",
        "成本价与当前市值对比",
        "持有收益与收益率",
        "持仓占比联动资产结构",
      ]}
      aiHint="当前 AI 助手已能分析你的资产结构与账户余额，投资持仓数据接入后即可一并纳入。"
    />
  );
}
