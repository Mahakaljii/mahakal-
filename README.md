# Telegram SMM Management Bot — Monitoring Build

This upload-ready Node.js project provides owner-only Telegram channel monitoring, JSON persistence, encrypted provider credential storage, channel-to-provider service-reference mapping, duplicate-post detection, and post-detection reports.

**This build does not place paid views, likes, reactions, or other artificial-engagement orders.** Provider details and service references are stored for administration only.

## Requirements
- Node.js 20+
- A Telegram bot token from BotFather
- The bot must be an administrator in each channel it monitors
- Railway persistent volume mounted at `/app/data` (recommended)

## Install and run
```bash
npm install
cp .env.example .env
# Fill in BOT_TOKEN, OWNER_ID, and PANEL_ENCRYPTION_KEY
npm start
```

## Railway variables
- `BOT_TOKEN`
- `OWNER_ID`
- `DATA_DIR=/app/data`
- `PANEL_ENCRYPTION_KEY` (long random secret, at least 32 characters)

Mount a Railway Volume at `/app/data`. Without a persistent volume, local JSON data can be lost when the service is redeployed or its filesystem is replaced.

## Owner commands
- `/myid`
- `/addchannel @publicchannel`
- `/removechannel @publicchannel`
- `/channels`
- `/startqty @publicchannel` — compatibility command that starts post monitoring
- `/stopqty @publicchannel` — compatibility command that stops post monitoring
- `/getqty @publicchannel` — shows monitoring and mapping status; no order quantity is submitted
- `/newpanel Name | https://provider.example/api | API_KEY`
- `/allpanellist`
- `/removepanel PANEL_ID`
- `/channelservice @publicchannel PANEL_ID SERVICE_ID`
- `/allservicelist`
- `/channelservicelist`
- `/serviceremove @publicchannel`
- `/reportday [@publicchannel]`
- `/report24 [@publicchannel]`
- `/report72 [@publicchannel]`
- `/reportweek [@publicchannel]`
- `/reportmonth [@publicchannel]`
- `/qtyhelp`

## Notes
- Only public channels with usernames can be added with `/addchannel`.
- Add the bot as a channel administrator before registering it.
- API keys are encrypted at rest with AES-256-GCM. Keep `PANEL_ENCRYPTION_KEY` private and backed up; losing it means stored provider keys cannot be decrypted.
- JSON files are intended for a single bot process. Do not run multiple replicas against the same JSON directory.
- Reports count detected channel posts, not SMM order delivery.
