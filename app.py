
import os
import re
import bcrypt
import streamlit as st

from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError
from bson import ObjectId


# ==========================================
# PAGE CONFIGURATION
# ==========================================

st.set_page_config(
    page_title="Blood Connect",
    page_icon="🩸",
    layout="wide"
)

st.markdown("""
<style>
    .main {
        background-color: #f8f9fa;
    }
    .brand-title {
        color: #c62828;
        font-size: 38px;
        font-weight: 800;
        text-align: center;
    }
    .brand-subtitle {
        color: #555;
        text-align: center;
        font-size: 16px;
    }
    .stat-card {
        background: white;
        padding: 20px;
        border-radius: 12px;
        border-left: 5px solid #c62828;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    div.stButton > button {
        background-color: #c62828;
        color: white;
        border-radius: 8px;
        border: none;
        min-height: 40px;
    }
    div.stButton > button:hover {
        background-color: #a31515;
        color: white;
    }
</style>
""", unsafe_allow_html=True)


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_secret(name, default=None):
    try:
        value = st.secrets.get(name, default)
        if value:
            return value
    except Exception:
        pass

    return os.getenv(name, default)


MONGO_URI = get_secret("MONGO_URI")
DB_NAME = get_secret("MONGO_DB_NAME")

if not MONGO_URI:
    st.error(
        "MongoDB connection is not configured. "
        "Add MONGO_URI in Streamlit App Settings → Secrets."
    )
    st.stop()


@st.cache_resource
def connect_database(uri, database_name):
    client = MongoClient(
        uri,
        serverSelectionTimeoutMS=10000
    )

    client.admin.command("ping")

    if database_name:
        database = client[database_name]
    else:
        try:
            database = client.get_default_database()
        except Exception:
            database = client["blood_connect"]

    return client, database


try:
    client, db = connect_database(MONGO_URI, DB_NAME)

    users = db["users"]
    blood_requests = db["bloodrequests"]

    users.create_index("email", unique=True)

except Exception as error:
    st.error("Could not connect to MongoDB.")
    st.code(str(error))
    st.stop()


# ==========================================
# SESSION STATE
# ==========================================

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if "user" not in st.session_state:
    st.session_state.user = None


# ==========================================
# HELPER FUNCTIONS
# ==========================================

BLOOD_GROUPS = [
    "A+", "A-", "B+", "B-",
    "AB+", "AB-", "O+", "O-"
]


def safe_id(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def get_user_id(user):
    return user.get("_id")


def password_hash(password):
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )


def verify_password(password, stored_password):
    try:
        if isinstance(stored_password, str):
            stored_password = stored_password.encode("utf-8")

        return bcrypt.checkpw(
            password.encode("utf-8"),
            stored_password
        )
    except Exception:
        return False


def get_display_name(user):
    return user.get("name", "User")


def logout():
    st.session_state.logged_in = False
    st.session_state.user = None
    st.rerun()


def get_user_by_id(user_id):
    object_id = safe_id(user_id)

    if not object_id:
        return None

    return users.find_one({"_id": object_id})


def user_is_available(user):
    return user.get(
        "isAvailable",
        user.get("available", True)
    )


# ==========================================
# REGISTRATION
# ==========================================

def register_user(
    name,
    email,
    password,
    phone,
    blood_group,
    city,
    role
):
    email = email.strip().lower()

    if not name.strip():
        return False, "Please enter your name."

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return False, "Enter a valid email address."

    if len(password) < 6:
        return False, "Password must contain at least 6 characters."

    if users.find_one({"email": email}):
        return False, "This email is already registered."

    new_user = {
        "name": name.strip(),
        "email": email,
        "password": password_hash(password),
        "phone": phone.strip(),
        "bloodGroup": blood_group,
        "city": city.strip(),
        "role": role,
        "isAvailable": True if role == "donor" else False,
        "createdAt": datetime.utcnow()
    }

    try:
        users.insert_one(new_user)
        return True, "Registration successful! Please log in."

    except DuplicateKeyError:
        return False, "This email is already registered."

    except PyMongoError:
        return False, "Database error. Please try again."


# ==========================================
# LOGIN
# ==========================================

def login_user(email, password):
    email = email.strip().lower()

    user = users.find_one({"email": email})

    if not user:
        return None

    if verify_password(password, user.get("password", "")):
        return user

    return None


# ==========================================
# HEADER
# ==========================================

st.markdown(
    '<div class="brand-title">🩸 BLOOD CONNECT</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="brand-subtitle">'
    'Donate Blood • Save Lives • Connect Donors'
    '</div>',
    unsafe_allow_html=True
)

st.divider()


# ==========================================
# LOGIN AND REGISTRATION PAGE
# ==========================================

if not st.session_state.logged_in:

    login_tab, register_tab = st.tabs([
        "🔐 Login",
        "📝 Register"
    ])

    with login_tab:

        st.subheader("Welcome Back")

        with st.form("login_form"):

            email = st.text_input("Email Address")

            password = st.text_input(
                "Password",
                type="password"
            )

            login_button = st.form_submit_button(
                "Login",
                use_container_width=True
            )

            if login_button:

                if not email or not password:
                    st.error("Enter your email and password.")

                else:
                    try:
                        user = login_user(email, password)

                        if user:
                            st.session_state.logged_in = True
                            st.session_state.user = user
                            st.success("Login successful!")
                            st.rerun()

                        else:
                            st.error("Invalid email or password.")

                    except PyMongoError:
                        st.error("Unable to access the database.")

    with register_tab:

        st.subheader("Create Your Account")

        with st.form("register_form"):

            name = st.text_input("Full Name")

            email = st.text_input("Email Address")

            phone = st.text_input("Phone Number")

            city = st.text_input("City")

            blood_group = st.selectbox(
                "Blood Group",
                BLOOD_GROUPS
            )

            role = st.selectbox(
                "Account Type",
                ["donor", "recipient"]
            )

            password = st.text_input(
                "Create Password",
                type="password"
            )

            confirm_password = st.text_input(
                "Confirm Password",
                type="password"
            )

            register_button = st.form_submit_button(
                "Register",
                use_container_width=True
            )

            if register_button:

                if password != confirm_password:
                    st.error("Passwords do not match.")

                else:
                    success, message = register_user(
                        name,
                        email,
                        password,
                        phone,
                        blood_group,
                        city,
                        role
                    )

                    if success:
                        st.success(message)
                    else:
                        st.error(message)

    st.stop()


# ==========================================
# LOGGED-IN USER
# ==========================================

current_user = st.session_state.user

# Refresh user information from MongoDB
fresh_user = get_user_by_id(current_user["_id"])

if not fresh_user:
    logout()

st.session_state.user = fresh_user
current_user = fresh_user

user_id = get_user_id(current_user)
user_role = current_user.get("role", "recipient")


# ==========================================
# SIDEBAR
# ==========================================

st.sidebar.title("🩸 Blood Connect")

st.sidebar.write(
    f"Welcome, **{get_display_name(current_user)}**"
)

st.sidebar.write(
    f"Account: **{user_role.title()}**"
)

page_options = [
    "Dashboard",
    "Search Donors",
    "Blood Requests",
    "My Profile"
]

selected_page = st.sidebar.radio(
    "Navigation",
    page_options
)

if st.sidebar.button("Logout", use_container_width=True):
    logout()


# ==========================================
# DASHBOARD
# ==========================================

if selected_page == "Dashboard":

    st.title("Dashboard")

    total_donors = users.count_documents({
        "role": "donor"
    })

    available_donors = users.count_documents({
        "role": "donor",
        "isAvailable": True
    })

    total_requests = blood_requests.count_documents({})

    pending_requests = blood_requests.count_documents({
        "status": "pending"
    })

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Donors", total_donors)

    with col2:
        st.metric("Available Donors", available_donors)

    with col3:
        st.metric("Total Requests", total_requests)

    with col4:
        st.metric("Pending Requests", pending_requests)

    st.divider()

    st.subheader("Welcome to Blood Connect")

    st.write(
        "Blood Connect helps recipients find blood donors "
        "and enables donors to manage blood donation requests."
    )

    st.info(
        "Use the Search Donors section to find donors "
        "by blood group and city."
    )

    if user_role == "donor":

        st.subheader("Donor Availability")

        available = user_is_available(current_user)

        st.write(
            "Current status:",
            "🟢 Available" if available else "🔴 Unavailable"
        )

        new_availability = st.toggle(
            "I am available to donate blood",
            value=available
        )

        if new_availability != available:

            users.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "isAvailable": new_availability,
                        "available": new_availability
                    }
                }
            )

            st.success("Availability updated.")
            st.rerun()


# ==========================================
# SEARCH DONORS
# ==========================================

elif selected_page == "Search Donors":

    st.title("🔍 Search Blood Donors")

    col1, col2 = st.columns(2)

    with col1:
        search_group = st.selectbox(
            "Select Blood Group",
            ["All"] + BLOOD_GROUPS
        )

    with col2:
        search_city = st.text_input(
            "Enter City"
        )

    search_button = st.button(
        "Search Donors",
        use_container_width=True
    )

    if search_button:

        query = {
            "role": "donor",
            "isAvailable": True
        }

        if search_group != "All":
            query["bloodGroup"] = search_group

        if search_city.strip():
            query["city"] = {
                "$regex": re.escape(search_city.strip()),
                "$options": "i"
            }

        donor_results = list(
            users.find(query).limit(100)
        )

        if not donor_results:
            st.warning("No available donors found.")

        else:

            st.success(
                f"{len(donor_results)} donor(s) found."
            )

            for donor in donor_results:

                with st.container(border=True):

                    st.subheader(donor.get("name", "Donor"))

                    col1, col2, col3 = st.columns(3)

                    col1.write(
                        f"🩸 {donor.get('bloodGroup', 'N/A')}"
                    )

                    col2.write(
                        f"📍 {donor.get('city', 'N/A')}"
                    )

                    col3.write(
                        f"📞 {donor.get('phone', 'N/A')}"
                    )

                    if user_role == "recipient":

                        with st.expander("Send Blood Request"):

                            with st.form(
                                f"request_{donor['_id']}"
                            ):

                                units = st.number_input(
                                    "Units Required",
                                    min_value=1,
                                    max_value=10,
                                    value=1
                                )

                                hospital = st.text_input(
                                    "Hospital Name"
                                )

                                urgency = st.selectbox(
                                    "Urgency",
                                    [
                                        "Normal",
                                        "Urgent",
                                        "Emergency"
                                    ]
                                )

                                notes = st.text_area(
                                    "Additional Notes"
                                )

                                submit_request = st.form_submit_button(
                                    "Send Request"
                                )

                                if submit_request:

                                    if not hospital.strip():
                                        st.error(
                                            "Enter the hospital name."
                                        )

                                    else:

                                        request_document = {
                                            "donorId": donor["_id"],
                                            "recipientId": user_id,
                                            "requesterId": user_id,
                                            "bloodGroup": donor.get(
                                                "bloodGroup"
                                            ),
                                            "units": int(units),
                                            "hospital": hospital.strip(),
                                            "city": current_user.get(
                                                "city", ""
                                            ),
                                            "urgency": urgency,
                                            "notes": notes.strip(),
                                            "status": "pending",
                                            "createdAt": datetime.utcnow()
                                        }

                                        blood_requests.insert_one(
                                            request_document
                                        )

                                        st.success(
                                            "Blood request sent successfully!"
                                        )


# ==========================================
# BLOOD REQUESTS
# ==========================================

elif selected_page == "Blood Requests":

    st.title("📋 Blood Requests")

    incoming_tab, outgoing_tab = st.tabs([
        "Incoming Requests",
        "Outgoing Requests"
    ])

    with incoming_tab:

        if user_role == "donor":

            incoming = list(
                blood_requests.find({
                    "donorId": {
                        "$in": [
                            user_id,
                            str(user_id)
                        ]
                    }
                }).sort("createdAt", -1)
            )

            if not incoming:
                st.info("No incoming requests.")

            for request in incoming:

                with st.container(border=True):

                    st.subheader(
                        f"Request for {request.get('bloodGroup', 'N/A')}"
                    )

                    st.write(
                        f"Units: {request.get('units', 1)}"
                    )

                    st.write(
                        f"Hospital: {request.get('hospital', 'N/A')}"
                    )

                    st.write(
                        f"Urgency: {request.get('urgency', 'Normal')}"
                    )

                    st.write(
                        f"Status: {request.get('status', 'pending').title()}"
                    )

                    requester_id = (
                        request.get("recipientId")
                        or request.get("requesterId")
                        or request.get("senderId")
                    )

                    requester = get_user_by_id(requester_id)

                    if requester:
                        st.write(
                            f"Requested by: {requester.get('name', 'Recipient')}"
                        )
                        st.write(
                            f"Phone: {requester.get('phone', 'N/A')}"
                        )

                    if request.get("status", "pending") == "pending":

                        col1, col2 = st.columns(2)

                        with col1:
                            if st.button(
                                "Accept",
                                key=f"accept_{request['_id']}"
                            ):

                                blood_requests.update_one(
                                    {"_id": request["_id"]},
                                    {
                                        "$set": {
                                            "status": "accepted"
                                        }
                                    }
                                )

                                st.success("Request accepted.")
                                st.rerun()

                        with col2:
                            if st.button(
                                "Reject",
                                key=f"reject_{request['_id']}"
                            ):

                                blood_requests.update_one(
                                    {"_id": request["_id"]},
                                    {
                                        "$set": {
                                            "status": "rejected"
                                        }
                                    }
                                )

                                st.warning("Request rejected.")
                                st.rerun()

        else:
            st.info("Incoming requests are available for donor accounts.")


    with outgoing_tab:

        outgoing = list(
            blood_requests.find({
                "$or": [
                    {"recipientId": user_id},
                    {"recipientId": str(user_id)},
                    {"requesterId": user_id},
                    {"requesterId": str(user_id)},
                    {"senderId": user_id},
                    {"senderId": str(user_id)}
                ]
            }).sort("createdAt", -1)
        )

        if not outgoing:
            st.info("You have not sent any requests.")

        for request in outgoing:

            with st.container(border=True):

                st.subheader(
                    f"{request.get('bloodGroup', 'N/A')} Blood Request"
                )

                st.write(
                    f"Units: {request.get('units', 1)}"
                )

                st.write(
                    f"Hospital: {request.get('hospital', 'N/A')}"
                )

                st.write(
                    f"Status: {request.get('status', 'pending').title()}"
                )


# ==========================================
# PROFILE
# ==========================================

elif selected_page == "My Profile":

    st.title("👤 My Profile")

    st.write(f"**Name:** {current_user.get('name', 'N/A')}")

    st.write(f"**Email:** {current_user.get('email', 'N/A')}")

    st.write(f"**Phone:** {current_user.get('phone', 'N/A')}")

    st.write(
        f"**Blood Group:** {current_user.get('bloodGroup', 'N/A')}"
    )

    st.write(f"**City:** {current_user.get('city', 'N/A')}")

    st.write(f"**Role:** {user_role.title()}")

    st.divider()

    if user_role == "donor":

        st.subheader("Manage Availability")

        current_status = user_is_available(current_user)

        status = st.toggle(
            "Available for blood donation",
            value=current_status
        )

        if status != current_status:

            users.update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "isAvailable": status,
                        "available": status
                    }
                }
            )

            st.success("Your availability has been updated.")
            st.rerun()


# ==========================================
# FOOTER
# ==========================================

st.divider()

st.markdown(
    "<center>🩸 Blood Connect | Donate Blood, Save Lives</center>",
    unsafe_allow_html=True
)
