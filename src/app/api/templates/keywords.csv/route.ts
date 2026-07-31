import { NextResponse } from "next/server";

const KEYWORD_TEMPLATE = `keyword,search_volume,difficulty,cpc,country,city,device,url,is_brand,intent,group,baseline_position,current_position,best_position
roof repair mumbai,1900,42,2.5,IN,Mumbai,DESKTOP,https://example.com/roof-repair,false,COMMERCIAL,Core Services,28,8,8
roof leak repair,3600,48,3.1,IN,Mumbai,DESKTOP,https://example.com/leak-repair,false,COMMERCIAL,Core Services,45,12,10
best roofing company,880,39,2.8,IN,Mumbai,MOBILE,https://example.com/,false,COMMERCIAL,Brand,60,22,18
`;

const RANKING_TEMPLATE = `keyword,date,position,url,device,location
roof repair mumbai,2026-07-01,8,https://example.com/roof-repair,DESKTOP,Mumbai
roof repair mumbai,2026-06-01,14,https://example.com/roof-repair,DESKTOP,Mumbai
`;

const BACKLINK_TEMPLATE = `source_url,target_url,anchor_text,link_type,status,domain_rating,first_seen,acquired,cost,vendor,campaign,method
https://homeblog.example/roof-care,https://client.com/roof-repair,roof repair tips,dofollow,live,45,2026-06-01,2026-06-15,150,OutreachPro,Q3 Authority,GUEST_POST
https://diyforum.example/t/3456,https://client.com/,Client Name,nofollow,live,22,2026-05-20,2026-06-01,,,Community,OUTREACH
`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  let body = KEYWORD_TEMPLATE;
  let filename = "keywords-template.csv";
  if (type === "rankings") {
    body = RANKING_TEMPLATE;
    filename = "rankings-template.csv";
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
