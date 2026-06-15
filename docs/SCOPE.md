# Data Problems Found in CSV

## Problem 1: Negative Amounts
- **Found in rows:** 4, 12, 23
- **Detection:** amount < 0
- **Policy:** Treat as REFUND, convert to positive
- **Why:** Expense reports often include credits

## Problem 2: Missing Dates
- **Found in rows:** 7, 15
- **Detection:** empty date field
- **Policy:** Use current date
- **Why:** Better to import with current date than reject

## Problem 3: Future Dates
- **Found in rows:** 9
- **Detection:** date > today
- **Policy:** Cap at today's date
- **Why:** Can't have future expenses

## Problem 4: Member Moved Out
- **Found in rows:** 18, 19, 20
- **Detection:** expense_date > member.move_out_date
- **Policy:** Still import but flag as anomaly
- **Why:** Ex-member might still owe for shared expenses

## Problems 5-12:
[Continue with all 12 anomalies found in your CSV]