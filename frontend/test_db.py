# test_db.py

import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        user="postgres.olpbsweghilvjwikpwap",
        password="HamsaHennila@",
        database="postgres",
        host="aws-1-ap-south-1.pooler.supabase.com",
        port=5432,
    )
    print("CONNECTED")
    await conn.close()

asyncio.run(main())