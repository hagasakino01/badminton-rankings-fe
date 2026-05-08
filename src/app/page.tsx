import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  Medal,
  Shuffle,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Shuffle,
    title: "Xếp lịch công bằng",
    description:
      "Tạo các cặp đấu đôi ngẫu nhiên nhưng vẫn cân tải, giảm lặp đồng đội và đối thủ xuyên suốt mùa.",
  },
  {
    icon: Swords,
    title: "Chốt kết quả theo buổi",
    description:
      "Mỗi buổi đấu được lưu một lần duy nhất, khóa chỉnh sửa sau khi xác nhận để giữ dữ liệu minh bạch.",
  },
  {
    icon: Medal,
    title: "Bảng xếp hạng sống",
    description:
      "Điểm, win rate, hiệu số và số buổi tham gia được cập nhật tức thời sau mỗi lần nhập kết quả.",
  },
];

const highlights = [
  { label: "Quy mô phù hợp", value: "8-20", note: "người chơi mỗi bảng" },
  { label: "Tối thiểu mỗi session", value: "5", note: "người để tạo buổi đấu" },
  { label: "Loại hình", value: "SRS", note: "mùa giải đánh đôi có xếp hạng" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,rgba(15,118,110,0.96),rgba(18,52,86,0.95))] text-primary-foreground shadow-2xl shadow-primary/15 ring-1 ring-white/10">
          <CardContent className="grid gap-8 px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/14 text-white hover:bg-white/20">Phiên bản điều phối mùa giải</Badge>
              <Badge className="bg-white/10 text-white/80 hover:bg-white/15">Shadcn UI refresh</Badge>
            </div>

            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Badminton Club OS</p>
              <h1 className="max-w-4xl font-heading text-4xl leading-none font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Bỏ spreadsheet đi. Vận hành cả mùa giải trên một giao diện rõ ràng hơn.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
                Từ tạo bảng, mở mùa, sinh buổi đấu, nhập tỷ số đến tổng kết xếp hạng cá nhân, mọi thứ
                được gom vào một mặt điều phối nhất quán dành riêng cho giải cầu lông đánh đôi.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-slate-900 hover:bg-white/88",
                )}
              >
                Bắt đầu tạo giải
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/25 bg-white/10 text-white hover:bg-white/14 hover:text-white",
                )}
              >
                Mở dashboard
              </Link>
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/12 bg-white/8 p-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="space-y-1 rounded-2xl bg-black/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">{item.label}</p>
                  <p className="font-heading text-3xl font-semibold">{item.value}</p>
                  <p className="text-sm text-white/70">{item.note}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/85 shadow-xl shadow-black/5 ring-1 ring-black/6 backdrop-blur">
          <CardHeader className="space-y-3">
            <Badge variant="secondary" className="w-fit gap-1">
              <Sparkles className="size-3.5" />
              Nhịp vận hành
            </Badge>
            <CardTitle className="font-heading text-2xl">Một mùa giải, ba trục kiểm soát.</CardTitle>
            <CardDescription className="text-sm leading-6">
              Giao diện mới ưu tiên hành động rõ ràng: biết mình đang ở mùa nào, buổi nào, ai đang
              dẫn đầu và đâu là thao tác có thể thay đổi dữ liệu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <p className="font-medium">Nhóm người chơi</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Quản lý danh sách thành viên, trạng thái active/inactive và lịch sử tham gia theo
                  buổi.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarRange className="size-4 text-primary" />
                  <p className="font-medium">Mùa & session</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Mỗi session được tạo có điều kiện, lưu kết quả có xác nhận và khóa lại sau khi chốt.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Medal className="size-4 text-primary" />
                  <p className="font-medium">Xếp hạng cá nhân</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Theo dõi thứ hạng toàn mùa bằng điểm, số trận, số buổi, số lần vắng và hiệu số.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <Card
              key={feature.title}
              className="border-0 bg-card/88 shadow-lg shadow-black/5 ring-1 ring-black/6 backdrop-blur transition-transform hover:-translate-y-1"
            >
              <CardHeader className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="font-heading text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{feature.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-0 bg-card/88 shadow-lg shadow-black/5 ring-1 ring-black/6">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">Quy trình vận hành</Badge>
            <CardTitle className="font-heading text-2xl">Luồng làm việc mới, ít ma sát hơn.</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              Thiết kế mới gom các thao tác quan trọng vào từng cụm rõ ràng: tạo dữ liệu ở đầu vào,
              theo dõi trạng thái ở giữa và khóa lịch sử ở đầu ra.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Dựng bảng & roster",
                text: "Tạo group, thêm người chơi và kiểm soát danh sách active trước khi mở mùa.",
              },
              {
                step: "02",
                title: "Điều phối session",
                text: "Chọn người tham gia, sinh lịch thi đấu và nhập đầy đủ tỷ số theo từng trận.",
              },
              {
                step: "03",
                title: "Chốt mùa giải",
                text: "Khóa các buổi đã lưu, xem bảng xếp hạng cuối và kết thúc mùa với dữ liệu sạch.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-3xl border border-border/70 bg-background/75 p-5">
                <p className="text-xs uppercase tracking-[0.26em] text-primary">{item.step}</p>
                <Separator className="my-4" />
                <h3 className="font-heading text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 bg-[linear-gradient(180deg,rgba(245,241,232,0.95),rgba(255,255,255,0.88))] shadow-xl shadow-black/5 ring-1 ring-black/6">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Sẵn sàng chuyển sang giao diện mới?</CardTitle>
            <CardDescription className="text-sm leading-6">
              Toàn bộ dashboard đã sẵn để mở rộng tiếp bằng các pattern của `shadcn/ui` thay vì
              tiếp tục bồi thêm CSS thủ công.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Bộ component mới giúp form, modal, card, bảng và trạng thái nhìn đồng nhất hơn, đồng
              thời dễ bảo trì hơn cho các bước phát triển tiếp theo.
            </div>
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "w-full justify-center")}>
              Tạo tài khoản quản trị
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
