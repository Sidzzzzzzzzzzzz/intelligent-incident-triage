import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib
import os  # <--- Add this

# 1. Load Data (Robust Path Finding)
# This finds the folder where the script is running, then looks for data.csv there
current_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(current_dir, 'data.csv')

try:
    df = pd.read_csv(csv_path)
    print(f"Data loaded successfully from: {csv_path}")
except FileNotFoundError:
    print(f"Error: data.csv not found at: {csv_path}")
    exit()

# ... rest of the code stays the same ...

# 2. Prepare Data
X = df['message']
y = df['priority']

# 3. Vectorize Text (Turn words into numbers)
vectorizer = TfidfVectorizer()
X_vectorized = vectorizer.fit_transform(X)

# 4. Train Model
model = LogisticRegression()
model.fit(X_vectorized, y)

# 5. Save the Model and Vectorizer
joblib.dump(model, 'classifier.pkl')
joblib.dump(vectorizer, 'vectorizer.pkl')

print("Model trained and saved successfully!")