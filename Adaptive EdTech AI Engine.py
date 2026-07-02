import streamlit as st
import json
import base64
from google import genai
from google.genai import types
from PIL import Image
import io
import os

# Set custom page config first
st.set_page_config(
    page_title="EduAdapt AI | Real-time Lesson Scaffold Engine",
    page_icon="🎓",
    layout="wide"
)

# -------------------------------------------------------------
# 🔑 API KEY CONFIGURATION
# -------------------------------------------------------------
# Provided API Key: AIzaSyBaL2A7VNrgVSSs3XkXUIcfwcGEAcupgXE
# The code will check for an environment variable first, otherwise 
# it falls back to the provided API Key.
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBaL2A7VNrgVSSs3XkXUIcfwcGEAcupgXE")

# Initialize the modern Gemini Client with the API key
client = genai.Client(api_key=API_KEY)

# Custom Elegant Styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    .main-header {
        font-weight: 700;
        color: #1e293b;
    }
    .custom-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        margin-bottom: 20px;
    }
</style>
""", unsafe_allow_html=True)

st.title("⚡ EduAdapt: Real-time Lesson Scaffold Engine")
st.caption("Powered by Gemini 3.5 Flash — Ultra-low latency adaptive learning & diagnostic evaluation")

# Role Selection
st.sidebar.markdown("### 🔒 Workstation Options")
role = st.sidebar.selectbox("Select Role View", ["Teacher Workspace", "Student Portal"])

st.sidebar.markdown("---")
st.sidebar.markdown("""
### 🛠️ How to run locally:
If you are getting a **'streamlit' is not recognized** error, follow these simple steps to install and run the engine on your computer:

1. **Open your Terminal/Command Prompt (cmd).**
2. **Install Streamlit and dependencies:**
   ```bash
   pip install streamlit google-genai pillow
   ```
3. **Run this script:**
   Navigate to your project directory (e.g., using `cd "C:\\Users\\Asus\\Downloads\\New folder\\Hackathon Projects\\Buildathon"`) and run:
   ```bash
   python -m streamlit run "Adaptive EdTech AI Engine.py"
   ```
   *(Using `python -m streamlit` bypasses the environment path issues entirely!)*
""")

# Helper to load and prepare file for Gemini SDK
def prepare_gemini_file(uploaded_file):
    if uploaded_file is None:
        return None
    
    file_bytes = uploaded_file.read()
    # Reset file pointer for any subsequent reads
    uploaded_file.seek(0)
    
    # Return Part object with inlineData
    return types.Part.from_bytes(
        data=file_bytes,
        mime_type=uploaded_file.type
    )

if role == "Teacher Workspace":
    st.subheader("📝 Upload and Adapt Learning Paths")
    
    col_input, col_preset = st.columns([2, 1])
    
    with col_input:
        st.markdown("<div class='custom-card'>", unsafe_allow_html=True)
        uploaded_file = st.file_uploader(
            "Upload lesson notes, slides, screenshots or textbooks (Optional)", 
            type=["png", "jpg", "jpeg", "pdf", "txt"]
        )
        topic_text = st.text_input("Enter the core learning concept or topic:", placeholder="e.g. Schrödinger's Cat, The Doppler Effect...")
        st.markdown("</div>", unsafe_allow_html=True)
    
    with col_preset:
        st.markdown("💡 **Quick Concept Starters**")
        presets = {
            "The Doppler Effect": "How sound pitch changes with motion based on compression/rarefaction.",
            "Blockchain Proof of Work": "Cryptographic zero-knowledge consensus secured by hash computation.",
            "How Inflation Works": "Purchasing power mechanics driven by excessive currency supplies.",
            "Schrödinger's Cat": "Quantum superpositions illustrating the measurement paradox."
        }
        for name, desc in presets.items():
            if st.button(f"✨ Use: {name}", key=f"preset_{name}"):
                st.session_state.temp_topic = name
                st.rerun()
                
        if "temp_topic" in st.session_state:
            topic_text = st.session_state.pop("temp_topic")

    # Compile Trigger
    if st.button("🚀 Compile Adaptive Framework", type="primary") and (uploaded_file or topic_text):
        with st.spinner("Gemini 3.5 Flash is executing multi-track adaptation..."):
            contents = []
            
            # If user uploaded an asset, format it correctly for the modern SDK
            if uploaded_file:
                file_part = prepare_gemini_file(uploaded_file)
                if file_part:
                    contents.append(file_part)
            
            user_prompt = f"""Deconstruct, synthesize and adapt this educational material.
Topic / Reference: {topic_text if topic_text else 'Document Attached'}

Generate exactly:
1) A simplified 'remedial_text' explanation (5th-grade level, utilizing vivid, physical visual analogies and simple terms).
2) An 'advanced_text' explanation with academic rigor, deep technical/analytical details, complex implications, and mathematical foundations where appropriate.
3) A 3-question adaptive 'quiz' array. Each question must include 'question', 'options' (array of 4 unique options), 'correct' (must match one of the options exactly), a constructive 'hint', and a 'scaffolded_step' (guiding step-by-step logic when they answer incorrectly)."""

            contents.append(user_prompt)
            
            try:
                # Utilizing Gemini 3.5 Flash structural capabilities
                response = client.models.generate_content(
                    model='gemini-3.5-flash',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        system_instruction=(
                            "You are an expert adaptive EdTech AI Engine. "
                            "You synthesize learning materials into a 5th-grade analogical explanation, an advanced analytical explanation, "
                            "and a structured 3-question adaptive quiz. "
                            "You must always return a valid JSON matching this schema: "
                            "{'remedial_text': '...', 'advanced_text': '...', 'quiz': [{'question': '...', 'options': ['...'], 'correct': '...', 'hint': '...', 'scaffolded_step': '...'}]}"
                        )
                    ),
                )
                
                st.session_state.lesson_data = json.loads(response.text)
                st.session_state.current_topic = topic_text if topic_text else "Custom Document"
                st.success("🎉 Lesson dynamically structured and broadcasted to Student Portal!")
            except Exception as e:
                st.error(f"Engine Generation Refused: {str(e)}")

    if 'lesson_data' in st.session_state:
        data = st.session_state.lesson_data
        st.write("---")
        st.subheader(f"📊 Active Learning Pathway: {st.session_state.get('current_topic', '')}")
        
        col1, col2 = st.columns(2)
        with col1:
            st.info("### 🟢 Foundation Track (Remedial)")
            st.write(data.get('remedial_text'))
        with col2:
            st.warning("### 🔵 Accelerated Track (Advanced Deep-Dive)")
            st.write(data.get('advanced_text'))

elif role == "Student Portal":
    st.subheader("🎓 Your Tailored Classroom")
    if 'lesson_data' not in st.session_state:
        st.info("💡 Waiting for your teacher to build and broadcast lesson data... (Please run Teacher Workspace first to load or select a topic)")
    else:
        data = st.session_state.lesson_data
        topic_name = st.session_state.get('current_topic', 'Active Concept')
        
        st.markdown(f"### Current Concept Study: **{topic_name}**")
        
        # Track choice selector
        track = st.radio("Select Your Learning Speed:", ["Foundation (5th-Grade Visual analogies)", "Accelerated (Deep-Dive Analysis)"])
        
        with st.expander("📖 Read Your Assigned Lesson Material", expanded=True):
            if "Foundation" in track:
                st.markdown("### 🟢 Visual Analogy Map")
                st.write(data.get('remedial_text'))
            else:
                st.markdown("### 🔵 Analytical Pathway")
                st.write(data.get('advanced_text'))
            
        st.write("---")
        st.subheader("⚡ Live-Feedback Diagnostic Evaluation")
        
        quiz_list = data.get('quiz', [])
        
        if not quiz_list:
            st.warning("No quiz questions generated for this module.")
        else:
            # Custom styled quiz cards
            for i, q in enumerate(quiz_list):
                st.markdown(f"<div class='custom-card'>", unsafe_allow_html=True)
                st.markdown(f"**Question {i+1}:** {q['question']}")
                
                # Dynamic key avoids state collision
                ans_key = f"ans_val_{topic_name}_{i}"
                sub_key = f"submitted_{topic_name}_{i}"
                att_key = f"attempts_{topic_name}_{i}"
                
                # Option selection
                choice = st.radio("Select the correct answer:", q['options'], key=ans_key)
                
                # Check for answer submission state
                if sub_key not in st.session_state:
                    st.session_state[sub_key] = False
                if att_key not in st.session_state:
                    st.session_state[att_key] = 0
                
                col_btn, col_feedback = st.columns([1, 4])
                
                with col_btn:
                    if st.button(f"Verify Answer {i+1}", key=f"btn_verify_{i}"):
                        st.session_state[sub_key] = True
                        st.session_state[att_key] += 1
                
                if st.session_state[sub_key]:
                    is_correct = (choice == q['correct'])
                    if is_correct:
                        st.success(f"🎯 **Mastered!** Correct on attempt #{st.session_state[att_key]}.")
                    else:
                        st.error("Let's refine your approach.")
                        
                        # Diagnostic scaffolding
                        st.markdown(f"💡 **Dynamic Hint:** *{q['hint']}*")
                        
                        # If they failed on the first attempt, reveal the step-by-step diagnostic breakdown
                        if st.session_state[att_key] >= 1:
                            st.markdown(
                                f"<div style='background-color:#eff6ff; padding:12px; border-left:4px solid #3b82f6; border-radius:4px; font-size:13px;'>"
                                f"<strong>🛠️ Scaffolded Guidance:</strong> {q.get('scaffolded_step', 'Try breaking the concept down into parts.')}"
                                f"</div>", 
                                unsafe_allow_html=True
                            )
                st.markdown("</div>", unsafe_allow_html=True)
