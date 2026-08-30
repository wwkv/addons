# Ideas & Future Features

Backlog of ideas raised during sessions but deliberately not implemented yet, so they don't derail whatever's currently in progress. Roughly ordered by priority — reorder as priorities shift.

## 1. Google Calendar integration
Connect to Google Calendar so that, when reviewing an uncategorized or unclear transaction, you can see what was happening on that date without switching to a separate calendar app. Today this means manually checking the agenda to remember what a transaction was for.

Rough shape: show calendar events for a transaction's date inline (e.g. in the CatPicker or a hover tooltip), likely read-only, likely via Google Calendar API with OAuth.

## 2. AI-assisted category suggestion from counterparty lookup
A button that looks up what a company/name is (e.g. via web search or an LLM) and suggests a category based on that, for counterparties that don't match any existing rule or pattern. Useful for one-off or unfamiliar merchants where the auto-categorization rules (`rules.js`) don't have a match.

Open questions: which lookup source (LLM with web access vs. a fixed API), where the button lives (CatPicker? import preview?), and how it interacts with the existing pattern-learning system.

## 3. Projects with their own budget (cross-category)
A "Project" (e.g. wedding, home renovation) as a cross-cutting label with its own budget target and running "€X / €Y spent" total — distinct from a regular category. Today, project-like spending (e.g. the existing "Projecten" category with "Trouw"/"Renovatie" subcategories) is just a normal category, which forces a tradeoff: either lump everything under it and lose the fact that catering money would otherwise count as food budget, or spread costs across normal categories and lose the "total project cost so far" view.

Rough shape: a `projectId` (or array of tags) on a transaction, independent of `categoryId`/`subCategoryId`; a dedicated Projects tab showing budget vs. spent per project; a way to attach a project label from the CatPicker or right-click menu alongside the normal category.

## 4. Subscriptions watcher
Automatically detect recurring subscription-style transactions (same counterparty, similar amount, roughly monthly/yearly interval) and surface them in one place instead of them blending into the regular transaction list. Useful for spotting price increases, subscriptions nobody uses anymore, and a single "total recurring spend per month" figure.

Rough shape: reuse the existing pattern-detection logic (`rules.js`/Patronen) to flag recurring counterparties; a dedicated view listing each detected subscription with last-seen amount, frequency, and a trend indicator if the amount changed; a manual "dit is geen abonnement" override for false positives.

## Done

- ~~Mark merged PayPal transactions~~ — merged transactions now get `paypalMerged: true`, shown as a small "PP" badge next to the counterparty in the Transactions list, and searchable by typing "paypal" in the search box.
- ~~Retroactively mark old PayPal merges~~ — re-importing a historical PayPal CSV now detects duplicates that match an unmarked existing transaction and offers to backfill `paypalMerged: true` on them, shown as "🏷️ Markeer als PayPal" in the import preview.
- ~~Delete category from a transaction~~ — right-click → "🚫 Verwijder categorie" clears categoryId/subCategoryId, making it uncategorized again.
- ~~Tinder mode skip should leave transactions uncategorized~~ — skip now sets categoryId/subCategoryId to null instead of the "Nog te verwerken" parking category.
- ~~Rename/delete/archive categories & subcategories~~ — Categories tab now has ✏️ rename, 🗄️/📤 archive toggle, and 🗑️ delete (with transaction count warning) for both categories and subcategories. Archived items are hidden from the category picker but still show (dimmed) in the Categories tab and remain intact in stats/history.
