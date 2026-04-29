--
-- PostgreSQL database dump
--

\restrict pcqqYcJ12bzg1h3T7byMqXMRH3xIQKD2agUoJFEX8d5dqXYnFNbPqGDOaDlLnvT

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-04-29 15:56:17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 232 (class 1259 OID 17674)
-- Name: codes_inscription; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.codes_inscription (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    role_id integer NOT NULL,
    description text,
    actif boolean DEFAULT true,
    utilise_fois integer DEFAULT 0,
    max_utilisations integer,
    expire_le timestamp without time zone,
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.codes_inscription OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17673)
-- Name: codes_inscription_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.codes_inscription_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.codes_inscription_id_seq OWNER TO postgres;

--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 231
-- Name: codes_inscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.codes_inscription_id_seq OWNED BY public.codes_inscription.id;


--
-- TOC entry 226 (class 1259 OID 17554)
-- Name: demandes_conges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demandes_conges (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    type_conge_id integer NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    demi_journee_debut character varying(10),
    demi_journee_fin character varying(10),
    nombre_jours numeric(5,2) NOT NULL,
    motif text,
    statut character varying(20) DEFAULT 'pending_manager'::character varying,
    approbateur_id integer,
    date_approbation timestamp without time zone,
    motif_refus text,
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modifie_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_statut CHECK (((statut)::text = ANY ((ARRAY['pending_manager'::character varying, 'pending_admin'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.demandes_conges OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17553)
-- Name: demandes_conges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.demandes_conges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.demandes_conges_id_seq OWNER TO postgres;

--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 225
-- Name: demandes_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.demandes_conges_id_seq OWNED BY public.demandes_conges.id;


--
-- TOC entry 236 (class 1259 OID 24761)
-- Name: demandes_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demandes_permissions (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    type_permission_id integer NOT NULL,
    date_permission date NOT NULL,
    heure_debut time without time zone,
    heure_fin time without time zone,
    duree_heures numeric(3,1) NOT NULL,
    motif text,
    statut character varying(20) DEFAULT 'pending_manager'::character varying,
    approbateur_id integer,
    date_approbation timestamp without time zone,
    motif_refus text,
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.demandes_permissions OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 24760)
-- Name: demandes_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.demandes_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.demandes_permissions_id_seq OWNER TO postgres;

--
-- TOC entry 5053 (class 0 OID 0)
-- Dependencies: 235
-- Name: demandes_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.demandes_permissions_id_seq OWNED BY public.demandes_permissions.id;


--
-- TOC entry 230 (class 1259 OID 17639)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    type character varying(50) NOT NULL,
    titre character varying(255) NOT NULL,
    message text,
    est_lu boolean DEFAULT false,
    lien character varying(500),
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    lu_le timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17638)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- TOC entry 5054 (class 0 OID 0)
-- Dependencies: 229
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 218 (class 1259 OID 17435)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nom character varying(50) NOT NULL,
    description character varying(255)
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 17434)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5055 (class 0 OID 0)
-- Dependencies: 217
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 228 (class 1259 OID 17615)
-- Name: solde_conges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solde_conges (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    annee integer NOT NULL,
    type_conge_id integer NOT NULL,
    total_jours numeric(6,2) DEFAULT 0,
    pris_jours numeric(6,2) DEFAULT 0,
    restant_jours numeric(6,2) DEFAULT 0,
    report_annee_precedente numeric(6,2) DEFAULT 0
);


ALTER TABLE public.solde_conges OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17614)
-- Name: solde_conges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solde_conges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solde_conges_id_seq OWNER TO postgres;

--
-- TOC entry 5056 (class 0 OID 0)
-- Dependencies: 227
-- Name: solde_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solde_conges_id_seq OWNED BY public.solde_conges.id;


--
-- TOC entry 224 (class 1259 OID 17529)
-- Name: types_conges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.types_conges (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    nom character varying(100) NOT NULL,
    description text,
    couleur character varying(7) DEFAULT '#3498db'::character varying,
    actif boolean DEFAULT true,
    jours_par_defaut numeric(5,2)
);


ALTER TABLE public.types_conges OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17528)
-- Name: types_conges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.types_conges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.types_conges_id_seq OWNER TO postgres;

--
-- TOC entry 5057 (class 0 OID 0)
-- Dependencies: 223
-- Name: types_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.types_conges_id_seq OWNED BY public.types_conges.id;


--
-- TOC entry 234 (class 1259 OID 24749)
-- Name: types_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.types_permissions (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    nom character varying(100) NOT NULL,
    description text,
    duree_max_heures numeric(3,1),
    actif boolean DEFAULT true
);


ALTER TABLE public.types_permissions OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 24748)
-- Name: types_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.types_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.types_permissions_id_seq OWNER TO postgres;

--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 233
-- Name: types_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.types_permissions_id_seq OWNED BY public.types_permissions.id;


--
-- TOC entry 220 (class 1259 OID 17444)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    telephone character varying(20),
    service character varying(100),
    poste character varying(100),
    date_embauche date,
    manager_id integer,
    statut character varying(20) DEFAULT 'actif'::character varying,
    token_activation character varying(255),
    token_activation_expire timestamp without time zone,
    token_reset character varying(255),
    token_reset_expire timestamp without time zone,
    derniere_connexion timestamp without time zone,
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    modifie_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 17443)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 222 (class 1259 OID 17466)
-- Name: utilisateurs_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilisateurs_roles (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    role_id integer NOT NULL,
    assigne_par integer,
    assigne_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.utilisateurs_roles OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17465)
-- Name: utilisateurs_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utilisateurs_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utilisateurs_roles_id_seq OWNER TO postgres;

--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 221
-- Name: utilisateurs_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utilisateurs_roles_id_seq OWNED BY public.utilisateurs_roles.id;


--
-- TOC entry 4809 (class 2604 OID 17677)
-- Name: codes_inscription id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codes_inscription ALTER COLUMN id SET DEFAULT nextval('public.codes_inscription_id_seq'::regclass);


--
-- TOC entry 4797 (class 2604 OID 17557)
-- Name: demandes_conges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges ALTER COLUMN id SET DEFAULT nextval('public.demandes_conges_id_seq'::regclass);


--
-- TOC entry 4815 (class 2604 OID 24764)
-- Name: demandes_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_permissions ALTER COLUMN id SET DEFAULT nextval('public.demandes_permissions_id_seq'::regclass);


--
-- TOC entry 4806 (class 2604 OID 17642)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4787 (class 2604 OID 17438)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 4801 (class 2604 OID 17618)
-- Name: solde_conges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges ALTER COLUMN id SET DEFAULT nextval('public.solde_conges_id_seq'::regclass);


--
-- TOC entry 4794 (class 2604 OID 17532)
-- Name: types_conges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_conges ALTER COLUMN id SET DEFAULT nextval('public.types_conges_id_seq'::regclass);


--
-- TOC entry 4813 (class 2604 OID 24752)
-- Name: types_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_permissions ALTER COLUMN id SET DEFAULT nextval('public.types_permissions_id_seq'::regclass);


--
-- TOC entry 4788 (class 2604 OID 17447)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4792 (class 2604 OID 17469)
-- Name: utilisateurs_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles ALTER COLUMN id SET DEFAULT nextval('public.utilisateurs_roles_id_seq'::regclass);


--
-- TOC entry 5041 (class 0 OID 17674)
-- Dependencies: 232
-- Data for Name: codes_inscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.codes_inscription (id, code, role_id, description, actif, utilise_fois, max_utilisations, expire_le, cree_le) FROM stdin;
\.


--
-- TOC entry 5035 (class 0 OID 17554)
-- Dependencies: 226
-- Data for Name: demandes_conges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.demandes_conges (id, utilisateur_id, type_conge_id, date_debut, date_fin, demi_journee_debut, demi_journee_fin, nombre_jours, motif, statut, approbateur_id, date_approbation, motif_refus, cree_le, modifie_le) FROM stdin;
1	5	1	2026-04-30	2026-05-11	\N	\N	12.00		rejected	2	2026-04-27 12:25:54.301222	teste	2026-04-27 12:25:20.547082	2026-04-27 12:25:20.547082
\.


--
-- TOC entry 5045 (class 0 OID 24761)
-- Dependencies: 236
-- Data for Name: demandes_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.demandes_permissions (id, utilisateur_id, type_permission_id, date_permission, heure_debut, heure_fin, duree_heures, motif, statut, approbateur_id, date_approbation, motif_refus, cree_le) FROM stdin;
1	5	1	2026-04-27	14:51:00	16:51:00	2.0		pending_manager	\N	\N	\N	2026-04-27 14:51:17.219815
2	5	1	2026-04-27	15:06:00	17:06:00	2.0		pending_manager	\N	\N	\N	2026-04-27 15:06:42.413604
\.


--
-- TOC entry 5039 (class 0 OID 17639)
-- Dependencies: 230
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, utilisateur_id, type, titre, message, est_lu, lien, cree_le, lu_le) FROM stdin;
1	2	demande_recue	Nouvelle demande de conge	RJ Nantenaina a fait une demande de conge du 2026-04-30 au 2026-05-11 (12 jours)	f	/dashboard/manager/validations	2026-04-27 12:25:20.559756	\N
2	5	refus_manager	Demande de conge refusee	Votre demande de conge a ete refusee par votre manager.\n\nMotif : teste	t	/dashboard/employee/requests	2026-04-27 12:25:54.303621	2026-04-27 12:26:21.891957
3	2	permission_recue	Nouvelle demande de permission	RJ Nantenaina a fait une demande de permission le 2026-04-27 de 14:51 à 16:51 (2h)	f	/dashboard/manager/validations	2026-04-27 14:51:17.228015	\N
4	2	permission_recue	Nouvelle demande de permission	RJ Nantenaina a fait une demande de permission le 2026-04-27 de 15:06 à 17:06 (2h)	f	/dashboard/manager/validations	2026-04-27 15:06:42.42247	\N
\.


--
-- TOC entry 5027 (class 0 OID 17435)
-- Dependencies: 218
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nom, description) FROM stdin;
1	employe	Utilisateur standard - pose des congés
2	manager	Responsable d équipe - valide les demandes
3	admin	Administrateur - gère tout
\.


--
-- TOC entry 5037 (class 0 OID 17615)
-- Dependencies: 228
-- Data for Name: solde_conges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solde_conges (id, utilisateur_id, annee, type_conge_id, total_jours, pris_jours, restant_jours, report_annee_precedente) FROM stdin;
1	1	2026	1	25.00	0.00	25.00	0.00
2	1	2026	2	12.00	0.00	12.00	0.00
3	2	2026	1	25.00	0.00	25.00	0.00
4	2	2026	2	12.00	0.00	12.00	0.00
5	3	2026	1	25.00	0.00	25.00	0.00
6	3	2026	2	12.00	0.00	12.00	0.00
7	4	2026	1	25.00	0.00	25.00	0.00
8	4	2026	2	12.00	0.00	12.00	0.00
10	5	2026	2	12.00	0.00	12.00	0.00
9	5	2026	1	25.00	0.00	25.00	0.00
\.


--
-- TOC entry 5033 (class 0 OID 17529)
-- Dependencies: 224
-- Data for Name: types_conges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.types_conges (id, code, nom, description, couleur, actif, jours_par_defaut) FROM stdin;
1	CP	Congés Payés	Congés payés annuels	#2ecc71	t	25.00
2	RTT	RTT	Réduction du temps de travail	#3498db	t	12.00
3	SANS_SOLDE	Congé sans solde	Congé non rémunéré	#e74c3c	t	\N
\.


--
-- TOC entry 5043 (class 0 OID 24749)
-- Dependencies: 234
-- Data for Name: types_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.types_permissions (id, code, nom, description, duree_max_heures, actif) FROM stdin;
1	PERM	Permission	Permission horaire	4.0	t
\.


--
-- TOC entry 5029 (class 0 OID 17444)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, nom, prenom, telephone, service, poste, date_embauche, manager_id, statut, token_activation, token_activation_expire, token_reset, token_reset_expire, derniere_connexion, cree_le, modifie_le) FROM stdin;
1	mitiarj05@gmail.com	$2a$10$sSQvCtZWEC1aEcVIaGqCJe5RF1zk99JYQSPQ8ARuPTZUNpZYKkUsi	Mitia	RJ	0328725411	\N	\N	\N	\N	actif	\N	\N	\N	\N	2026-04-27 12:38:53.422366	2026-04-24 20:48:36.964045	2026-04-24 20:48:36.964045
2	titaxwinno@gmail.com	$2a$10$DDjlelwB7IZrXJ6/3MMbA.GrbABgJ3mvPnGtqMVWLK3.SAevoi6bC	tafita	yo	0389815487	\N	\N	\N	\N	actif	\N	\N	\N	\N	2026-04-27 12:39:34.56798	2026-04-24 20:49:48.229286	2026-04-24 20:49:48.229286
5	nantenaina@gmail.com	$2a$10$Zr2yb3Xzcj0q9ZvVTL0dTOlky3VYfmAYXhNc9Y7e1Wr821ZlC126y	Nantenaina	RJ	0340512654	\N	\N	\N	2	actif	\N	\N	\N	\N	2026-04-27 15:41:57.800526	2026-04-27 11:16:05.167881	2026-04-27 11:16:33.149746
3	soundevenement08@gmail.com	$2a$10$LZmboE2RL.Yee6MMfgvTGe8FkGXAotRYrAKQikyCqMbFSiwyR0Iju	Nantenaina	Raj	0345726237	\N	\N	\N	2	actif	\N	\N	\N	\N	2026-04-27 11:06:27.794286	2026-04-24 20:50:17.567284	2026-04-24 21:19:42.934915
4	rakotonandrasana@gmail.com	$2a$10$NIu8TUicuK4uvcej3UmM7.R/HVOKnjcoytnddV8AOnQPReGF6RqA.	Rakoto	Nandrasana	0389815487	\N	\N	\N	\N	actif	\N	\N	\N	\N	2026-04-27 12:12:51.946683	2026-04-27 11:14:28.233623	2026-04-27 12:11:39.960232
\.


--
-- TOC entry 5031 (class 0 OID 17466)
-- Dependencies: 222
-- Data for Name: utilisateurs_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilisateurs_roles (id, utilisateur_id, role_id, assigne_par, assigne_le) FROM stdin;
1	1	3	\N	2026-04-24 20:48:36.967017
2	1	1	\N	2026-04-24 20:48:36.969555
3	2	1	\N	2026-04-24 20:49:48.231468
4	3	1	\N	2026-04-24 20:50:17.569813
5	2	2	1	2026-04-24 20:51:54.668995
6	4	1	\N	2026-04-27 11:14:28.237875
7	5	1	\N	2026-04-27 11:16:05.171706
\.


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 231
-- Name: codes_inscription_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.codes_inscription_id_seq', 1, false);


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 225
-- Name: demandes_conges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.demandes_conges_id_seq', 1, true);


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 235
-- Name: demandes_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.demandes_permissions_id_seq', 2, true);


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 229
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 4, true);


--
-- TOC entry 5065 (class 0 OID 0)
-- Dependencies: 217
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 5066 (class 0 OID 0)
-- Dependencies: 227
-- Name: solde_conges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solde_conges_id_seq', 10, true);


--
-- TOC entry 5067 (class 0 OID 0)
-- Dependencies: 223
-- Name: types_conges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.types_conges_id_seq', 3, true);


--
-- TOC entry 5068 (class 0 OID 0)
-- Dependencies: 233
-- Name: types_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.types_permissions_id_seq', 1, true);


--
-- TOC entry 5069 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- TOC entry 5070 (class 0 OID 0)
-- Dependencies: 221
-- Name: utilisateurs_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utilisateurs_roles_id_seq', 7, true);


--
-- TOC entry 4856 (class 2606 OID 17686)
-- Name: codes_inscription codes_inscription_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codes_inscription
    ADD CONSTRAINT codes_inscription_code_key UNIQUE (code);


--
-- TOC entry 4858 (class 2606 OID 17684)
-- Name: codes_inscription codes_inscription_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codes_inscription
    ADD CONSTRAINT codes_inscription_pkey PRIMARY KEY (id);


--
-- TOC entry 4841 (class 2606 OID 17565)
-- Name: demandes_conges demandes_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_pkey PRIMARY KEY (id);


--
-- TOC entry 4866 (class 2606 OID 24770)
-- Name: demandes_permissions demandes_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_permissions
    ADD CONSTRAINT demandes_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4854 (class 2606 OID 17648)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4820 (class 2606 OID 17442)
-- Name: roles roles_nom_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nom_key UNIQUE (nom);


--
-- TOC entry 4822 (class 2606 OID 17440)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4848 (class 2606 OID 17624)
-- Name: solde_conges solde_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_pkey PRIMARY KEY (id);


--
-- TOC entry 4850 (class 2606 OID 17626)
-- Name: solde_conges solde_conges_utilisateur_id_annee_type_conge_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_utilisateur_id_annee_type_conge_id_key UNIQUE (utilisateur_id, annee, type_conge_id);


--
-- TOC entry 4837 (class 2606 OID 17540)
-- Name: types_conges types_conges_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_conges
    ADD CONSTRAINT types_conges_code_key UNIQUE (code);


--
-- TOC entry 4839 (class 2606 OID 17538)
-- Name: types_conges types_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_conges
    ADD CONSTRAINT types_conges_pkey PRIMARY KEY (id);


--
-- TOC entry 4862 (class 2606 OID 24759)
-- Name: types_permissions types_permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_permissions
    ADD CONSTRAINT types_permissions_code_key UNIQUE (code);


--
-- TOC entry 4864 (class 2606 OID 24757)
-- Name: types_permissions types_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_permissions
    ADD CONSTRAINT types_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4827 (class 2606 OID 17456)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4829 (class 2606 OID 17454)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4833 (class 2606 OID 17472)
-- Name: utilisateurs_roles utilisateurs_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4835 (class 2606 OID 17474)
-- Name: utilisateurs_roles utilisateurs_roles_utilisateur_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_utilisateur_id_role_id_key UNIQUE (utilisateur_id, role_id);


--
-- TOC entry 4859 (class 1259 OID 17692)
-- Name: idx_ci_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ci_code ON public.codes_inscription USING btree (code);


--
-- TOC entry 4860 (class 1259 OID 17693)
-- Name: idx_ci_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ci_role ON public.codes_inscription USING btree (role_id);


--
-- TOC entry 4842 (class 1259 OID 17584)
-- Name: idx_dc_approbateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dc_approbateur ON public.demandes_conges USING btree (approbateur_id);


--
-- TOC entry 4843 (class 1259 OID 17583)
-- Name: idx_dc_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dc_dates ON public.demandes_conges USING btree (date_debut, date_fin);


--
-- TOC entry 4844 (class 1259 OID 17582)
-- Name: idx_dc_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dc_statut ON public.demandes_conges USING btree (statut);


--
-- TOC entry 4845 (class 1259 OID 17581)
-- Name: idx_dc_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dc_utilisateur ON public.demandes_conges USING btree (utilisateur_id);


--
-- TOC entry 4851 (class 1259 OID 17655)
-- Name: idx_notif_cree; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_cree ON public.notifications USING btree (cree_le);


--
-- TOC entry 4852 (class 1259 OID 17654)
-- Name: idx_notif_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_utilisateur ON public.notifications USING btree (utilisateur_id, est_lu);


--
-- TOC entry 4846 (class 1259 OID 17637)
-- Name: idx_sc_utilisateur_annee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sc_utilisateur_annee ON public.solde_conges USING btree (utilisateur_id, annee);


--
-- TOC entry 4830 (class 1259 OID 17491)
-- Name: idx_ur_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ur_role ON public.utilisateurs_roles USING btree (role_id);


--
-- TOC entry 4831 (class 1259 OID 17490)
-- Name: idx_ur_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ur_utilisateur ON public.utilisateurs_roles USING btree (utilisateur_id);


--
-- TOC entry 4823 (class 1259 OID 17462)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4824 (class 1259 OID 17464)
-- Name: idx_users_manager; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_manager ON public.users USING btree (manager_id);


--
-- TOC entry 4825 (class 1259 OID 17463)
-- Name: idx_users_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_statut ON public.users USING btree (statut);


--
-- TOC entry 4877 (class 2606 OID 17687)
-- Name: codes_inscription codes_inscription_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codes_inscription
    ADD CONSTRAINT codes_inscription_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 4871 (class 2606 OID 17576)
-- Name: demandes_conges demandes_conges_approbateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_approbateur_id_fkey FOREIGN KEY (approbateur_id) REFERENCES public.users(id);


--
-- TOC entry 4872 (class 2606 OID 17571)
-- Name: demandes_conges demandes_conges_type_conge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_type_conge_id_fkey FOREIGN KEY (type_conge_id) REFERENCES public.types_conges(id);


--
-- TOC entry 4873 (class 2606 OID 17566)
-- Name: demandes_conges demandes_conges_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id);


--
-- TOC entry 4878 (class 2606 OID 24781)
-- Name: demandes_permissions demandes_permissions_approbateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_permissions
    ADD CONSTRAINT demandes_permissions_approbateur_id_fkey FOREIGN KEY (approbateur_id) REFERENCES public.users(id);


--
-- TOC entry 4879 (class 2606 OID 24776)
-- Name: demandes_permissions demandes_permissions_type_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_permissions
    ADD CONSTRAINT demandes_permissions_type_permission_id_fkey FOREIGN KEY (type_permission_id) REFERENCES public.types_permissions(id);


--
-- TOC entry 4880 (class 2606 OID 24771)
-- Name: demandes_permissions demandes_permissions_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_permissions
    ADD CONSTRAINT demandes_permissions_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4876 (class 2606 OID 17649)
-- Name: notifications notifications_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4874 (class 2606 OID 17632)
-- Name: solde_conges solde_conges_type_conge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_type_conge_id_fkey FOREIGN KEY (type_conge_id) REFERENCES public.types_conges(id);


--
-- TOC entry 4875 (class 2606 OID 17627)
-- Name: solde_conges solde_conges_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4867 (class 2606 OID 17457)
-- Name: users users_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4868 (class 2606 OID 17485)
-- Name: utilisateurs_roles utilisateurs_roles_assigne_par_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_assigne_par_fkey FOREIGN KEY (assigne_par) REFERENCES public.users(id);


--
-- TOC entry 4869 (class 2606 OID 17480)
-- Name: utilisateurs_roles utilisateurs_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4870 (class 2606 OID 17475)
-- Name: utilisateurs_roles utilisateurs_roles_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-04-29 15:56:17

--
-- PostgreSQL database dump complete
--

\unrestrict pcqqYcJ12bzg1h3T7byMqXMRH3xIQKD2agUoJFEX8d5dqXYnFNbPqGDOaDlLnvT

