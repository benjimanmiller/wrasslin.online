DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS promotion;
DROP TABLE IF EXISTS roster_member;
DROP TABLE IF EXISTS title;
DROP TABLE IF EXISTS title_history;
DROP TABLE IF EXISTS post;
DROP TABLE IF EXISTS comment;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS follower;
DROP TABLE IF EXISTS post_like;
DROP TABLE IF EXISTS xp_setting;
DROP TABLE IF EXISTS user_xp_log;
DROP TABLE IF EXISTS banned_ip;
DROP TABLE IF EXISTS moderation_log;
DROP TABLE IF EXISTS award;
DROP TABLE IF EXISTS user_award;

-- Users: Handles Promoters, Wrestlers, Staff, Refs, and Fans
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('promoter', 'wrestler', 'staff', 'ref', 'fan', 'manager')),
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    
    -- Wrestler/Performer Specifics
    display_name TEXT, -- For when username differs from stage name
    height TEXT,
    weight TEXT,
    hometown TEXT,
    dob DATE,
    finisher TEXT,
    theme_music TEXT,
    alignment TEXT, -- Face, Heel, Tweener
    
    -- Status & Permissions
    is_admin BOOLEAN DEFAULT 0,
    is_banned BOOLEAN DEFAULT 0,
    last_ip TEXT, -- For IP banning correlation

    -- Personal / Contact Info
    real_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    latitude REAL,
    longitude REAL,

    -- Social Media
    website_url TEXT,
    x_url TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    twitch_url TEXT,
    bsky_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promotions: The organizations (managed by a Promoter)
CREATE TABLE promotion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    
    -- Contact & Socials
    contact_email TEXT,
    website_url TEXT,
    x_url TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    twitch_url TEXT,
    bsky_url TEXT,
    
    city TEXT,
    state TEXT,
    country TEXT,
    founded_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES user (id)
);

-- Roster: Links Wrestlers/Staff to Promotions (Many-to-Many)
CREATE TABLE roster_member (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    promotion_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- e.g. 'Wrestler', 'Ref', 'Manager'
    roster_name TEXT, -- Optional: If they use a different name in this promotion
    active BOOLEAN DEFAULT 1,
    
    -- Contract Details
    start_date DATE,
    end_date DATE,

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user (id),
    FOREIGN KEY (promotion_id) REFERENCES promotion (id)
);

-- Titles: Belts, Briefcases, Trophies
CREATE TABLE title (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promotion_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Belt', 'Briefcase', 'Trophy'
    description TEXT,
    image_url TEXT,
    active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotion (id)
);

-- Title History: Tracks who held what and when
CREATE TABLE title_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id INTEGER NOT NULL,
    wrestler_id INTEGER NOT NULL,
    won_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lost_date TIMESTAMP,
    notes TEXT, -- e.g. "Won at SummerSlam"
    FOREIGN KEY (title_id) REFERENCES title (id),
    FOREIGN KEY (wrestler_id) REFERENCES user (id)
);

-- Posts: Updates from users (Promoters, Wrestlers, Staff)
CREATE TABLE post (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    promotion_id INTEGER, -- Optional: if posting on behalf of a promotion
    content TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT, -- YouTube embed link
    is_pinned BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES user (id),
    FOREIGN KEY (promotion_id) REFERENCES promotion (id)
);

-- Comments: Fans (and others) commenting on posts
CREATE TABLE comment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES post (id),
    FOREIGN KEY (author_id) REFERENCES user (id)
);

-- Events: Shows created by promotions
CREATE TABLE event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promotion_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    date_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    timezone TEXT DEFAULT 'UTC',
    
    -- Location Details
    venue TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    latitude REAL,
    longitude REAL,

    description TEXT,
    poster_url TEXT,
    ticket_link TEXT,
    broadcast_link TEXT,
    status TEXT DEFAULT 'Scheduled', -- Scheduled, Cancelled, Completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotion (id)
);

-- Follows: Users following other Users or Promotions
CREATE TABLE follower (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    followed_user_id INTEGER,
    followed_promotion_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES user (id),
    FOREIGN KEY (followed_user_id) REFERENCES user (id),
    FOREIGN KEY (followed_promotion_id) REFERENCES promotion (id),
    CHECK (followed_user_id IS NOT NULL OR followed_promotion_id IS NOT NULL)
);

-- Likes: Users liking posts
CREATE TABLE post_like (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user (id),
    FOREIGN KEY (post_id) REFERENCES post (id),
    UNIQUE(user_id, post_id)
);

-- XP Settings: Configurable XP values per role and action
CREATE TABLE xp_setting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_key TEXT NOT NULL, -- e.g. 'attend_event', 'work_event', 'buy_merch'
    user_role TEXT NOT NULL, -- 'fan', 'wrestler', 'promoter', etc.
    xp_amount INTEGER NOT NULL DEFAULT 10,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(action_key, user_role)
);

-- XP Logs: History of XP gains
CREATE TABLE user_xp_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    xp_setting_id INTEGER,
    action_key TEXT NOT NULL, -- Snapshot of action
    xp_gained INTEGER NOT NULL,
    source_table TEXT, -- e.g. 'event', 'merch_order'
    source_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user (id),
    FOREIGN KEY (xp_setting_id) REFERENCES xp_setting (id)
);

-- Moderation: Banned IPs
CREATE TABLE banned_ip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    banned_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (banned_by) REFERENCES user (id)
);

-- Moderation: Admin Action Logs
CREATE TABLE moderation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    target_user_id INTEGER,
    target_type TEXT, -- 'user', 'post', 'comment', 'event'
    target_id INTEGER,
    action TEXT NOT NULL, -- 'ban_user', 'delete_post', 'warn'
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES user (id)
);

-- Awards: Digital Trophies/Badges definitions
CREATE TABLE award (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT, -- Icon for the award
    xp_bonus INTEGER DEFAULT 0, -- Optional XP grant upon receiving
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Awards: Awards given to specific users
CREATE TABLE user_award (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    award_id INTEGER NOT NULL,
    awarded_by INTEGER, -- Optional: if manually given by admin/system
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES user (id),
    FOREIGN KEY (award_id) REFERENCES award (id),
    FOREIGN KEY (awarded_by) REFERENCES user (id)
);