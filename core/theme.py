import streamlit as st

def inject_cricket_theme():
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@400;500&display=swap');

    /* ── BASE ── */
    html, body, .stApp {
        background-color: #06090F !important;
        color: #E8EDF5 !important;
        font-family: 'DM Sans', sans-serif !important;
    }
    .stApp > header { background: transparent !important; }
    .block-container { padding-top: 2rem !important; }

    /* ── SIDEBAR ── */
    [data-testid="stSidebar"] {
        background-color: #0A0E17 !important;
        border-right: 1px solid #1C2333 !important;
    }
    [data-testid="stSidebar"] .stButton > button {
        background: transparent !important;
        border: none !important;
        color: #4A6080 !important;
        font-family: 'DM Sans', sans-serif !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        text-align: left !important;
        padding: 9px 12px !important;
        border-radius: 7px !important;
        width: 100% !important;
        letter-spacing: 0.3px !important;
        transition: all 0.15s ease !important;
        box-shadow: none !important;
    }
    [data-testid="stSidebar"] .stButton > button:hover {
        background: #0F1525 !important;
        color: #BFD0E8 !important;
        transform: none !important;
    }

    /* ── MAIN BUTTONS ── */
    .stButton > button {
        background-color: #F59E0B !important;
        color: #06090F !important;
        font-family: 'Rajdhani', sans-serif !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        letter-spacing: 1.5px !important;
        border: none !important;
        border-radius: 8px !important;
        transition: all 0.2s ease !important;
    }
    .stButton > button:hover {
        background-color: #D97706 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 20px rgba(245,158,11,0.25) !important;
    }

    /* ── HEADINGS ── */
    h1 {
        font-family: 'Rajdhani', sans-serif !important;
        font-size: 40px !important;
        font-weight: 700 !important;
        letter-spacing: 2px !important;
        color: #E8EDF5 !important;
        line-height: 1.1 !important;
        text-transform: uppercase !important;
    }
    h2 {
        font-family: 'Rajdhani', sans-serif !important;
        font-size: 26px !important;
        font-weight: 700 !important;
        letter-spacing: 2px !important;
        color: #E8EDF5 !important;
        text-transform: uppercase !important;
    }
    h3 {
        font-family: 'Rajdhani', sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        letter-spacing: 3px !important;
        text-transform: uppercase !important;
        color: #F59E0B !important;
    }

    /* ── INPUTS ── */
    .stTextInput > div > div > input,
    .stTextArea textarea {
        background-color: #0A0E17 !important;
        border: 1px solid #1C2333 !important;
        border-radius: 8px !important;
        color: #E8EDF5 !important;
        font-family: 'DM Sans', sans-serif !important;
    }
    .stTextInput > div > div > input:focus,
    .stTextArea textarea:focus {
        border-color: #F59E0B !important;
        box-shadow: 0 0 0 2px rgba(245,158,11,0.15) !important;
    }
    .stSelectbox > div > div {
        background-color: #0A0E17 !important;
        border: 1px solid #1C2333 !important;
        border-radius: 8px !important;
        color: #E8EDF5 !important;
    }

    /* ── CARDS ── */
    [data-testid="stVerticalBlockBorderWrapper"] {
        background-color: #0A0E17 !important;
        border: 1px solid #1C2333 !important;
        border-radius: 10px !important;
    }

    /* ── METRICS ── */
    [data-testid="stMetric"] {
        background: #0A0E17 !important;
        border: 1px solid #1C2333 !important;
        border-top: 2px solid #F59E0B !important;
        border-radius: 10px !important;
        padding: 16px 18px !important;
    }
    [data-testid="stMetricValue"] {
        font-family: 'Rajdhani', sans-serif !important;
        font-size: 30px !important;
        font-weight: 700 !important;
        color: #E8EDF5 !important;
        letter-spacing: 1px !important;
    }
    [data-testid="stMetricLabel"] {
        font-size: 10px !important;
        letter-spacing: 2px !important;
        text-transform: uppercase !important;
        color: #3A4A60 !important;
        font-family: 'Rajdhani', sans-serif !important;
    }

    /* ── TABS ── */
    .stTabs [data-baseweb="tab-list"] {
        background: transparent !important;
        border-bottom: 1px solid #1C2333 !important;
        gap: 4px !important;
    }
    .stTabs [data-baseweb="tab"] {
        font-family: 'Rajdhani', sans-serif !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        letter-spacing: 1.5px !important;
        color: #3A4A60 !important;
        background: transparent !important;
        border-radius: 0 !important;
    }
    .stTabs [aria-selected="true"] {
        color: #F59E0B !important;
        border-bottom: 2px solid #F59E0B !important;
        background: transparent !important;
    }

    /* ── EXPANDER ── */
    .streamlit-expanderHeader {
        background-color: #0A0E17 !important;
        border: 1px solid #1C2333 !important;
        border-radius: 8px !important;
        color: #BFD0E8 !important;
        font-family: 'DM Sans', sans-serif !important;
        font-weight: 500 !important;
    }
    .streamlit-expanderContent {
        background-color: #0A0E17 !important;
        border: 1px solid #1C2333 !important;
        border-top: none !important;
        border-radius: 0 0 8px 8px !important;
    }

    /* ── DIVIDER ── */
    hr { border-color: #1C2333 !important; margin: 1.2rem 0 !important; }

    /* ── ALERTS ── */
    .stSuccess { background:#0D1A0A !important; border:1px solid #14532D !important; color:#22C55E !important; border-radius:8px !important; }
    .stError   { background:#1A0808 !important; border:1px solid #7F1D1D !important; color:#EF4444 !important; border-radius:8px !important; }
    .stWarning { background:#1A1200 !important; border:1px solid #78350F !important; color:#F59E0B !important; border-radius:8px !important; }
    .stInfo    { background:#080F1C !important; border:1px solid #1E3A5F !important; color:#38BDF8 !important; border-radius:8px !important; }

    /* ── DATAFRAME ── */
    [data-testid="stDataFrame"] {
        border: 1px solid #1C2333 !important;
        border-radius: 10px !important;
        overflow: hidden !important;
    }

    /* ── CHAT ── */
    [data-testid="stChatMessage"] {
        background-color: #0A0E17 !important;
        border: 1px solid #1C2333 !important;
        border-radius: 10px !important;
    }
    [data-testid="stChatInputTextArea"] {
        background-color: #0A0E17 !important;
        border: 1px solid #F59E0B !important;
        border-radius: 10px !important;
        color: #E8EDF5 !important;
    }

    /* ── SCROLLBAR ── */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #06090F; }
    ::-webkit-scrollbar-thumb { background: #1C2333; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #F59E0B; }

    /* ── RADIO & CHECKBOX ── */
    .stRadio label, .stCheckbox label {
        color: #BFD0E8 !important;
        font-family: 'DM Sans', sans-serif !important;
    }

    /* ── CAPTION / SMALL TEXT ── */
    .stCaption, small, .caption {
        color: #3A4A60 !important;
        font-size: 11px !important;
    }
    </style>
    """, unsafe_allow_html=True)


POSE_CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
    (11, 23), (12, 24), (23, 24),
    (23, 25), (24, 26), (25, 27), (26, 28)
]