DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS promotion;
DROP TABLE IF EXISTS roster_member;
DROP TABLE IF EXISTS title;
DROP TABLE IF EXISTS title_history;
DROP TABLE IF EXISTS title_defense;
DROP TABLE IF EXISTS match_participant;
DROP TABLE IF EXISTS match_card;
DROP TABLE IF EXISTS wrestling_group_member;
DROP TABLE IF EXISTS wrestling_group;
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

    -- Privacy Settings
    is_real_name_public BOOLEAN DEFAULT 0,
    is_contact_public BOOLEAN DEFAULT 0,
    is_location_public BOOLEAN DEFAULT 0,

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

-- Wrestling Groups: Factions, Stables, Tag Teams (e.g. The Bloodline, 4 Horsemen)
CREATE TABLE wrestling_group (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL, -- Manager or Wrestler who leads/manages the group
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES user (id)
);

-- Group Members: Tracks history of who is in the group and when
CREATE TABLE wrestling_group_member (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wrestling_group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP, -- If null, currently a member. If set, they are a past member.
    FOREIGN KEY (wrestling_group_id) REFERENCES wrestling_group (id),
    FOREIGN KEY (user_id) REFERENCES user (id)
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

-- Match Card: The matches taking place at an event
CREATE TABLE match_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    position INTEGER, -- Order on the card (1, 2, 3...)
    match_type TEXT, -- 'Singles', 'Tag Team', 'Triple Threat', 'Battle Royal'
    stipulation TEXT, -- 'No DQ', 'Cage Match', 'Ladder Match'
    
    -- Result Info
    duration_minutes INTEGER,
    duration_seconds INTEGER,
    finish_type TEXT, -- 'Pinfall', 'Submission', 'DQ', 'Countout', 'Draw'
    winner_notes TEXT, -- Summary of result
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES event (id)
);

-- Match Participants: Linking users to matches
CREATE TABLE match_participant (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    team_id INTEGER, -- Optional: Grouping for tag teams (e.g. 1 vs 2)
    wrestling_group_id INTEGER, -- Optional: Link to established Faction/Group
    outcome TEXT, -- 'Winner', 'Loser', 'Draw'
    FOREIGN KEY (match_id) REFERENCES match_card (id),
    FOREIGN KEY (user_id) REFERENCES user (id),
    FOREIGN KEY (wrestling_group_id) REFERENCES wrestling_group (id)
);

-- Title History: Tracks who held what and when
CREATE TABLE title_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id INTEGER NOT NULL,
    wrestler_id INTEGER, -- Nullable to allow Group-only reigns (Freebird rule)
    wrestling_group_id INTEGER, -- For Tag Teams or Factions
    match_id INTEGER, -- Linked to the match where title was won
    won_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lost_date TIMESTAMP,
    notes TEXT, -- e.g. "Won at SummerSlam"
    FOREIGN KEY (title_id) REFERENCES title (id),
    FOREIGN KEY (wrestler_id) REFERENCES user (id),
    FOREIGN KEY (wrestling_group_id) REFERENCES wrestling_group (id),
    FOREIGN KEY (match_id) REFERENCES match_card (id)
);

-- Title Defenses: Tracks successful defenses (or failures that don't change hands)
CREATE TABLE title_defense (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    result TEXT, -- 'Retained', 'DQ', 'Countout'
    notes TEXT,
    FOREIGN KEY (title_id) REFERENCES title (id),
    FOREIGN KEY (match_id) REFERENCES match_card (id)
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