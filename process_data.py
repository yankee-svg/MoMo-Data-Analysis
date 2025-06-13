import re
import sqlite3
from lxml import etree
import pandas as pd
from datetime import datetime
import os

# --- DATABASE SETUP ---
DB_FILE = "momo_transactions.db"
LOG_FILE = "unprocessed_logs.txt"

# Clear log file when startin 
if os.path.exists(LOG_FILE):
    os.remove(LOG_FILE)

def setup_database():
    """Creates the database and the transactions table."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT,
        timestamp DATETIME,
        type TEXT,
        amount REAL,
        fee REAL,
        recipient_name TEXT,
        recipient_phone TEXT,
        sender_name TEXT,
        sender_phone TEXT,
        new_balance REAL,
        status TEXT,
        raw_message TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_type ON transactions (type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON transactions (timestamp);")
    conn.commit()
    conn.close()

def log_unprocessed(message, timestamp):
    """Logs messages that couldn't be parsed."""
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(f"TIMESTAMP: {timestamp} | MESSAGE: {message}\n")

def clean_amount(amount_str):
    """Removes currency symbols and commas, returns a float."""
    if amount_str is None:
        return 0.0
    
    # non didital char removal
    cleaned_str = re.sub(r'[^\d.]', '', str(amount_str))
    return float(cleaned_str) if cleaned_str else 0.0


def parse_timestamp(ts_str):
    """Converts a Unix timestamp (in milliseconds) to a datetime object."""
    return datetime.fromtimestamp(int(ts_str) / 1000)

# --- regex patterns needed for paring ---

PATTERNS = {
    'incoming_money': re.compile(r"You have received ([\d,.]+) RWF from (.*?) \((\*+[\d]+|.*?)\) on your mobile money account at .*?\. Your new balance:([\d,.]+) RWF"),
    'payment_completed': re.compile(r"TxId: \d+\. Your payment of ([\d,.]+) RWF to (.*?) \d+ has been completed at .*?\. Your new balance: ([\d,.]+) RWF"),
    # Handles optional phone number and flexible spacing
    'transfer_sent': re.compile(r"\*165\*S\*([\d,.]+) RWF transferred to (.*?)(\s*\(.*?\))? from .*?\. Fee was: ([\d,.]+) RWF\. New balance: ([\d,.]+) RWF"),
    'bank_deposit': re.compile(r"A bank deposit of ([\d,.]+) RWF has been added to your mobile money account at .*?\. Your NEW BALANCE\s*:([\d,.]+) RWF"),
    'cashpower_payment': re.compile(r"Your payment of ([\d,.]+) RWF to MTN Cash Power.*?Fee was ([\d,.]+) RWF\. Your new balance: ([\d,.]+) RWF"),
    'airtime_payment': re.compile(r"Your payment of ([\d,.]+) RWF to Airtime with token.*?Fee was ([\d,.]+) RWF\. Your new balance: ([\d,.]+) RWF"),
    'bundle_purchase': re.compile(r"Your payment of ([\d,.]+) RWF to Bundles and Packs.*?Fee was ([\d,.]+) RWF\. Your new balance: ([\d,.]+) RWF"),
    'agent_withdrawal': re.compile(r"You .*? have via agent: (.*?) \((.*?)\), withdrawn ([\d,.]+) RWF.*?Your new balance: ([\d,.]+) RWF\. Fee paid: ([\d,.]+) RWF"),
    'third_party_direct_payment': re.compile(r"Y'ello,A transaction of ([\d,.]+) RWF by (.*?) on your MOMO account was successfully completed at .*?\. Your new balance:([\d,.]+) RWF\. Fee was ([\d,.]+) RWF"),
    'reversal_initiated': re.compile(r"A reversal has been initiated for your transaction to (.*?) \((.*?)\) with ([\d,.]+) RWF"),
    'reversal_completed': re.compile(r"Your transaction to (.*?) \((.*?)\) with ([\d,.]+) RWF has been reversed at .*?\. Your new balance is ([\d,.]+) RWF"),
    
    'otp': re.compile(r"one-time password is :(\d+)")
}

def parse_sms(sms_node):
    """Parses a single SMS XML node and returns a dictionary of structured data."""
    body = sms_node.get('body')
    timestamp = parse_timestamp(sms_node.get('date'))
    data = {'timestamp': timestamp, 'raw_message': body}


    # pattern matching
    for type, pattern in PATTERNS.items():
        match = pattern.search(body)
        if match:
            #  OTP messages aren't processed
            if type == 'otp':
                return None
                
            groups = match.groups()
            data['type'] = type
            
            # Use .get()
            if type == 'incoming_money':
                data.update({'amount': clean_amount(groups[0]), 'sender_name': groups[1].strip(), 'sender_phone': groups[2], 'new_balance': clean_amount(groups[3]), 'status': 'completed'})
            elif type == 'payment_completed':
                data.update({'amount': clean_amount(groups[0]), 'recipient_name': groups[1].strip(), 'new_balance': clean_amount(groups[2]), 'status': 'completed'})
            elif type == 'transfer_sent':
                 phone = groups[2].strip('() ') if groups[2] else None
                 data.update({'amount': clean_amount(groups[0]), 'recipient_name': groups[1].strip(), 'recipient_phone': phone, 'fee': clean_amount(groups[3]), 'new_balance': clean_amount(groups[4]), 'status': 'completed'})
            elif type == 'bank_deposit':
                data.update({'amount': clean_amount(groups[0]), 'sender_name': 'Bank', 'new_balance': clean_amount(groups[1]), 'type': 'bank_deposit', 'status': 'completed'})
            elif type in ['cashpower_payment', 'airtime_payment', 'bundle_purchase']:
                data.update({'amount': clean_amount(groups[0]), 'fee': clean_amount(groups[1]), 'new_balance': clean_amount(groups[2]), 'status': 'completed'})
            elif type == 'agent_withdrawal':
                data.update({'recipient_name': f"Agent: {groups[0].strip()}", 'recipient_phone': groups[1], 'amount': clean_amount(groups[2]), 'new_balance': clean_amount(groups[3]), 'fee': clean_amount(groups[4]), 'status': 'completed'})
            elif type == 'third_party_direct_payment':
                data.update({'amount': clean_amount(groups[0]), 'recipient_name': groups[1].strip(), 'new_balance': clean_amount(groups[2]), 'fee': clean_amount(groups[3]), 'status': 'completed'})
            elif type == 'reversal_initiated':
                data.update({'amount': clean_amount(groups[2]), 'recipient_name': groups[0].strip(), 'recipient_phone': groups[1], 'status': 'reversed'})
            elif type == 'reversal_completed':
                 data.update({'amount': clean_amount(groups[2]), 'recipient_name': groups[0].strip(), 'recipient_phone': groups[1], 'new_balance': clean_amount(groups[3]), 'status': 'reversed'})
            
            return data

    
    log_unprocessed(body, timestamp)
    return None


def process_xml_file(filepath, cursor):
    """Processes the entire XML file and inserts data into the database."""
    tree = etree.parse(filepath)
    root = tree.getroot()
    processed_count = 0
    total_sms = len(root.findall('sms'))
    
    for sms_node in root.findall('sms'):
        parsed_data = parse_sms(sms_node)
        if parsed_data:
            cursor.execute("""
            INSERT INTO transactions (
                transaction_id, timestamp, type, amount, fee, recipient_name,
                recipient_phone, sender_name, sender_phone, new_balance, status, raw_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                parsed_data.get('transaction_id'), parsed_data.get('timestamp'), parsed_data.get('type'),
                parsed_data.get('amount'), parsed_data.get('fee', 0.0), parsed_data.get('recipient_name'),
                parsed_data.get('recipient_phone'), parsed_data.get('sender_name'), parsed_data.get('sender_phone'),
                parsed_data.get('new_balance'), parsed_data.get('status', 'unknown'), parsed_data.get('raw_message')
            ))
            processed_count += 1
            
    print(f"Processed {processed_count} / {total_sms} records from XML.")


def process_csv_file(filepath, cursor):
    """Processes the CSV file and inserts data."""
    df = pd.read_csv(filepath)
    count = 0
    for _, row in df.iterrows():
        timestamp = pd.to_datetime(row['Timestamp']).to_pydatetime()
        
        # finds fee from message if it exists
        fee_match = re.search(r'Fee: RWF ([\d,.]+)', row['Message'])
        fee = clean_amount(fee_match.group(1)) if fee_match else 0.0

        # gettin balances from message if it exists
        balance_match = re.search(r'Your new balance is RWF ([\d,.]+)', row['Message'])
        new_balance = clean_amount(balance_match.group(1)) if balance_match else None

        cursor.execute("""
        INSERT INTO transactions (
            transaction_id, timestamp, type, amount, fee, recipient_phone, new_balance, status, raw_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['Reference'], timestamp, row['Type'], row['Amount'], 
            fee, row['Phone'], new_balance,
            'completed', row['Message']
        ))
        count += 1
    print(f"Processed {count} records from CSV.")



if __name__ == "__main__":
    setup_database()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    print("Clearing previous data from the database...")
    cursor.execute("DELETE FROM transactions;")
    conn.commit()
    
    print("\nProcessing data sources...")
    process_xml_file('data/modified_sms_v2.xml', cursor)
    process_csv_file('data/mtn_momo_transactions.csv', cursor)

    conn.commit()
    conn.close()
    print("\nDatabase population complete.")
    
    # logs double check

    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'r') as f:
            log_count = len(f.readlines())
            if log_count > 0:
                print(f"\nWARNING: {log_count} SMS messages could not be parsed. Check '{LOG_FILE}' for details.")