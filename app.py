import sqlite3
from flask import Flask, jsonify, request, render_template
from datetime import datetime

app = Flask(__name__)
DB_FILE = "momo_transactions.db"

def get_db_connection():
    """Establishes a connection to the database."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def convert_row_to_dict(row):
    """
    converts a sqlite3.Row object to a dictionary.
    """
    d = {}
    for key in row.keys():
        d[key] = row[key]
        
    if 'timestamp' in d and d['timestamp']:
        pass
    return d


@app.route('/')
def index():
    """Renders the main dashboard page."""
    return render_template('index.html')

@app.route('/api/transactions')
def get_transactions():
    """API endpoint to fetch transactions with optional filters."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM transactions WHERE 1=1"
    params = []
    
    trans_type = request.args.get('type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    search_query = request.args.get('search')
    
    if trans_type:
        query += " AND type = ?"
        params.append(trans_type)
        
    if start_date:
        query += " AND date(timestamp) >= ?"
        params.append(start_date)
        
    if end_date:
        query += " AND date(timestamp) <= ?"
        params.append(end_date)
        
    if search_query:
        query += " AND (recipient_name LIKE ? OR sender_name LIKE ? OR raw_message LIKE ?)"
        search_param = f"%{search_query}%"
        params.extend([search_param, search_param, search_param])
        
    query += " ORDER BY timestamp DESC"
    
    transactions_rows = cursor.execute(query, params).fetchall()
    conn.close()
    
    # Manually convert rows to a list of dictionaries
    transactions = [convert_row_to_dict(row) for row in transactions_rows]
    return jsonify(transactions)

@app.route('/api/summary')
def get_summary():
    """API endpoint to fetch aggregated data for charts."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Summary by type
    by_type_rows = cursor.execute("""
        SELECT type, COUNT(*) as count, SUM(amount) as total_amount
        FROM transactions
        WHERE type IS NOT NULL AND amount > 0 AND type != 'otp'
        GROUP BY type
    """).fetchall()
    
    by_month_rows = cursor.execute("""
        SELECT 
            strftime('%Y-%m', timestamp) as month,
            SUM(CASE WHEN amount > 0 AND type NOT IN ('incoming_money', 'bank_deposit') THEN amount ELSE 0 END) as total_spent,
            SUM(CASE WHEN amount > 0 AND type IN ('incoming_money', 'bank_deposit') THEN amount ELSE 0 END) as total_received
        FROM transactions
        WHERE timestamp >= date('now', '-12 months')
        GROUP BY month
        ORDER BY month
    """).fetchall()
    
    conn.close()
    
    # Manually convert all rows to ensure they are JSON serializable
    return jsonify({
        'by_type': [convert_row_to_dict(row) for row in by_type_rows],
        'by_month': [convert_row_to_dict(row) for row in by_month_rows]
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)
