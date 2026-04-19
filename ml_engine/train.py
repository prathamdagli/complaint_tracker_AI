import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib
import os

def train():
    print("Loading dataset...")
    df = pd.read_csv('../TS-PS14.csv')
    
    # We only need text and category for the classification agent
    X = df['text'].fillna('')
    y = df['category']
    
    print("Training TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
    X_vec = vectorizer.fit_transform(X)
    
    print("Training Logistic Regression Model...")
    model = LogisticRegression(max_iter=1000)
    model.fit(X_vec, y)
    
    # Save the models
    os.makedirs('models', exist_ok=True)
    joblib.dump(vectorizer, 'models/tfidf_vectorizer.pkl')
    joblib.dump(model, 'models/category_model.pkl')
    print("Models saved successfully in 'models/' directory.")

if __name__ == '__main__':
    train()
