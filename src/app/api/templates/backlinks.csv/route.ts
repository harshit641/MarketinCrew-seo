import { NextResponse } from "next/server";

const BACKLINK_TEMPLATE = `source_url,target_url,anchor_text,link_type,status,domain_rating,first_seen,acquired,cost,vendor,campaign,method
https://homeblog.example/roof-care,https://client.com/roof-repair,roof repair tips,dofollow,live,45,2026-06-01,2026-06-15,150,OutreachPro,Q3 Authority,GUEST_POST
https://diyforum.example/t/3456,https://client.com/,Client Name,nofollow,live,22,2026-05-20,2026-06-01,,,Community,OUTREACH
https://oldlistings.example/roofs,https://client.com/,roofers mumbai,dofollow,lost,30,2026-04-01,2026-04-10,,,Directory,DIRECTORY
`;

export async function GET() {
  return new NextResponse(BACKLINK_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="backlinks-template.csv"',
    },
  });
}
