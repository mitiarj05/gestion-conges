--
-- PostgreSQL database dump
--

\restrict JC6Fh7huqGuLB7OXmRHsOmZB2wkd3Ie5oD7TWvhLGGLbIOhwRDjuwVWQxL3heXG

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-05-22 11:18:55

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
-- TOC entry 226 (class 1259 OID 25188)
-- Name: demandes_conges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demandes_conges (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    type_conge_id integer NOT NULL,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    nombre_jours numeric(5,2) NOT NULL,
    motif text,
    statut character varying(20) DEFAULT 'pending_manager'::character varying,
    approbateur_id integer,
    date_approbation timestamp without time zone,
    motif_refus text,
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_statut CHECK (((statut)::text = ANY ((ARRAY['pending_manager'::character varying, 'pending_admin'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.demandes_conges OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 25187)
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
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 225
-- Name: demandes_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.demandes_conges_id_seq OWNED BY public.demandes_conges.id;


--
-- TOC entry 230 (class 1259 OID 25237)
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
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 25236)
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
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 229
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 232 (class 1259 OID 25253)
-- Name: paie_employes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paie_employes (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    mois integer NOT NULL,
    annee integer NOT NULL,
    salaire_base numeric(10,2) DEFAULT 0 NOT NULL,
    salaire_brut numeric(10,2) DEFAULT 0 NOT NULL,
    prime_transport numeric(10,2) DEFAULT 0,
    prime_performance numeric(10,2) DEFAULT 0,
    autre_prime numeric(10,2) DEFAULT 0,
    jours_absence_non_paye integer DEFAULT 0,
    retenue_absence numeric(10,2) DEFAULT 0,
    net_a_payer numeric(10,2) DEFAULT 0 NOT NULL,
    statut character varying(20) DEFAULT 'valide'::character varying,
    date_paiement date,
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.paie_employes OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 25252)
-- Name: paie_employes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paie_employes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.paie_employes_id_seq OWNER TO postgres;

--
-- TOC entry 5018 (class 0 OID 0)
-- Dependencies: 231
-- Name: paie_employes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paie_employes_id_seq OWNED BY public.paie_employes.id;


--
-- TOC entry 218 (class 1259 OID 25133)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nom character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 25132)
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
-- TOC entry 5019 (class 0 OID 0)
-- Dependencies: 217
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 228 (class 1259 OID 25215)
-- Name: solde_conges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solde_conges (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    annee integer NOT NULL,
    type_conge_id integer NOT NULL,
    total_jours numeric(6,2) DEFAULT 0,
    pris_jours numeric(6,2) DEFAULT 0,
    restant_jours numeric(6,2) DEFAULT 0
);


ALTER TABLE public.solde_conges OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 25214)
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
-- TOC entry 5020 (class 0 OID 0)
-- Dependencies: 227
-- Name: solde_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solde_conges_id_seq OWNED BY public.solde_conges.id;


--
-- TOC entry 224 (class 1259 OID 25179)
-- Name: types_conges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.types_conges (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    nom character varying(100) NOT NULL,
    jours_par_defaut numeric(5,2)
);


ALTER TABLE public.types_conges OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 25178)
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
-- TOC entry 5021 (class 0 OID 0)
-- Dependencies: 223
-- Name: types_conges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.types_conges_id_seq OWNED BY public.types_conges.id;


--
-- TOC entry 220 (class 1259 OID 25142)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    telephone character varying(20),
    service character varying(100),
    manager_id integer,
    statut character varying(20) DEFAULT 'actif'::character varying,
    cree_le timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    salaire_base numeric(10,2) DEFAULT 500000
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25141)
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
-- TOC entry 5022 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 222 (class 1259 OID 25160)
-- Name: utilisateurs_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilisateurs_roles (
    id integer NOT NULL,
    utilisateur_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.utilisateurs_roles OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 25159)
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
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 221
-- Name: utilisateurs_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utilisateurs_roles_id_seq OWNED BY public.utilisateurs_roles.id;


--
-- TOC entry 4784 (class 2604 OID 25191)
-- Name: demandes_conges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges ALTER COLUMN id SET DEFAULT nextval('public.demandes_conges_id_seq'::regclass);


--
-- TOC entry 4791 (class 2604 OID 25240)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 4794 (class 2604 OID 25256)
-- Name: paie_employes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paie_employes ALTER COLUMN id SET DEFAULT nextval('public.paie_employes_id_seq'::regclass);


--
-- TOC entry 4777 (class 2604 OID 25136)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 4787 (class 2604 OID 25218)
-- Name: solde_conges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges ALTER COLUMN id SET DEFAULT nextval('public.solde_conges_id_seq'::regclass);


--
-- TOC entry 4783 (class 2604 OID 25182)
-- Name: types_conges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_conges ALTER COLUMN id SET DEFAULT nextval('public.types_conges_id_seq'::regclass);


--
-- TOC entry 4778 (class 2604 OID 25145)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4782 (class 2604 OID 25163)
-- Name: utilisateurs_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles ALTER COLUMN id SET DEFAULT nextval('public.utilisateurs_roles_id_seq'::regclass);


--
-- TOC entry 5004 (class 0 OID 25188)
-- Dependencies: 226
-- Data for Name: demandes_conges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.demandes_conges (id, utilisateur_id, type_conge_id, date_debut, date_fin, nombre_jours, motif, statut, approbateur_id, date_approbation, motif_refus, cree_le) FROM stdin;
2	2	1	2026-05-23	2026-05-25	3.00	TEST	approved	1	2026-05-20 13:18:00.354434	\N	2026-05-20 13:16:33.125163
3	2	2	2026-05-27	2026-05-29	3.00		approved	1	2026-05-20 13:19:57.126962	\N	2026-05-20 13:19:17.756188
\.


--
-- TOC entry 5008 (class 0 OID 25237)
-- Dependencies: 230
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, utilisateur_id, type, titre, message, est_lu, lien, cree_le) FROM stdin;
1	2	team_added	Nouveau manager	Vous avez été ajouté à l équipe de Tafita Winno.	t	/dashboard/employee	2026-05-19 16:39:04.74459
5	2	approuve_final	Congé définitivement approuvé	Votre demande de congé du Fri May 22 2026 00:00:00 GMT+0300 (heure normale d’Afrique de l’Est) au Sun May 24 2026 00:00:00 GMT+0300 (heure normale d’Afrique de l’Est) a été définitivement approuvée.	t	/dashboard/employee/requests	2026-05-19 16:43:08.162175
3	2	pre_approuve	Demande pré-approuvée	Votre demande de congé a été validée par votre manager.	t	/dashboard/employee/requests	2026-05-19 16:42:30.58128
7	2	team_added	Nouveau manager	Vous avez été ajouté à l équipe de Tafita Winno.	t	/dashboard/employee	2026-05-19 19:28:59.986672
19	2	bulletin_paie	Bulletin de paie disponible	Votre bulletin de paie pour Mai 2026 est disponible. Net : 431818 Ar	t	/dashboard/employee/payroll	2026-05-20 13:20:13.173396
17	2	approuve_final	Congé définitivement approuvé	Votre demande de congé du Wed May 27 2026 00:00:00 GMT+0300 (heure normale d’Afrique de l’Est) au Fri May 29 2026 00:00:00 GMT+0300 (heure normale d’Afrique de l’Est) a été définitivement approuvée.	t	/dashboard/employee/requests	2026-05-20 13:19:57.129654
15	2	pre_approuve	Demande pré-approuvée	Votre demande de congé a été validée par votre manager.	t	/dashboard/employee/requests	2026-05-20 13:19:32.713921
13	2	bulletin_paie	Bulletin de paie disponible	Votre bulletin de paie pour Mai 2026 est disponible. Net : 500000 Ar	t	/dashboard/employee/payroll	2026-05-20 13:18:24.169078
11	2	approuve_final	Congé définitivement approuvé	Votre demande de congé du Sat May 23 2026 00:00:00 GMT+0300 (heure normale d’Afrique de l’Est) au Mon May 25 2026 00:00:00 GMT+0300 (heure normale d’Afrique de l’Est) a été définitivement approuvée.	t	/dashboard/employee/requests	2026-05-20 13:18:00.374214
9	2	pre_approuve	Demande pré-approuvée	Votre demande de congé a été validée par votre manager.	t	/dashboard/employee/requests	2026-05-20 13:16:51.30879
16	1	validation_requise	Demande à valider	Une demande de congé de SYROX UP attend votre validation.	t	/dashboard/admin	2026-05-20 13:19:32.722491
10	1	validation_requise	Demande à valider	Une demande de congé de SYROX UP attend votre validation.	t	/dashboard/admin	2026-05-20 13:16:51.311772
4	1	validation_requise	Demande à valider	Une demande de congé de SYROX UP attend votre validation.	t	/dashboard/admin	2026-05-19 16:42:30.586207
18	5	approuve_final_manager	Demande de congé approuvée	La demande de congé de SYROX UP a été définitivement approuvée.	t	/dashboard/manager/validations	2026-05-20 13:19:57.135588
14	5	demande_recue	Nouvelle demande de congé	SYROX UP a fait une demande de Congé sans solde du 2026-05-27 au 2026-05-29 (3 jours)	t	/dashboard/manager/validations	2026-05-20 13:19:17.767751
12	5	approuve_final_manager	Demande de congé approuvée	La demande de congé de SYROX UP a été définitivement approuvée.	t	/dashboard/manager/validations	2026-05-20 13:18:00.378972
8	5	demande_recue	Nouvelle demande de congé	SYROX UP a fait une demande de Congés Payés du 2026-05-23 au 2026-05-25 (3 jours)	t	/dashboard/manager/validations	2026-05-20 13:16:33.135066
20	5	demande_recue	Nouvelle demande de congé	SYROX UP a fait une demande de Congé sans solde du 2026-05-31 au 2026-06-01 (2 jours)	f	/dashboard/manager/validations	2026-05-22 10:56:07.297528
21	5	demande_annulee	Demande de congé annulée	SYROX UP a annulé sa demande de congé.	f	/dashboard/manager/validations	2026-05-22 11:13:40.70502
\.


--
-- TOC entry 5010 (class 0 OID 25253)
-- Dependencies: 232
-- Data for Name: paie_employes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paie_employes (id, utilisateur_id, mois, annee, salaire_base, salaire_brut, prime_transport, prime_performance, autre_prime, jours_absence_non_paye, retenue_absence, net_a_payer, statut, date_paiement, cree_le) FROM stdin;
5	2	5	2026	500000.00	500000.00	0.00	0.00	0.00	3	68181.82	431818.18	paye	2026-05-20	2026-05-20 13:20:13.170998
\.


--
-- TOC entry 4996 (class 0 OID 25133)
-- Dependencies: 218
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nom) FROM stdin;
1	employe
2	manager
3	admin
\.


--
-- TOC entry 5006 (class 0 OID 25215)
-- Dependencies: 228
-- Data for Name: solde_conges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.solde_conges (id, utilisateur_id, annee, type_conge_id, total_jours, pris_jours, restant_jours) FROM stdin;
1	1	2026	1	25.00	0.00	25.00
7	5	2026	1	25.00	0.00	25.00
8	6	2026	1	25.00	0.00	25.00
3	2	2026	1	25.00	6.00	19.00
\.


--
-- TOC entry 5002 (class 0 OID 25179)
-- Dependencies: 224
-- Data for Name: types_conges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.types_conges (id, code, nom, jours_par_defaut) FROM stdin;
1	CP	Congés Payés	25.00
2	SANS_SOLDE	Congé sans solde	\N
\.


--
-- TOC entry 4998 (class 0 OID 25142)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, nom, prenom, telephone, service, manager_id, statut, cree_le, salaire_base) FROM stdin;
1	mitiarj05@gmail.com	$2a$10$dF.oI76fhxLpCrMm3fIcpuDAFUD6wrS9SmU9CKyKzQx6hxxivD/va	Mitia	RJ	0328725411	\N	\N	actif	2026-05-19 16:02:15.893709	0.00
2	soundevenement08@gmail.com	$2a$10$P3Nu1FUmlHn6SJqGMui0Iuc0wwoLw6obJzR6lI2/Hoqf2a62nZtze	UP	SYROX	0389815487	\N	5	actif	2026-05-19 16:37:06.669911	500000.00
5	titaxwinno@gmail.com	$2a$10$d0t/cx/YJuFD2unQMMwp1.REU5mJkhcIM3IogjunC/Y/1/.n04tKi	Winno	Tafita	\N	\N	\N	actif	2026-05-19 19:27:37.006135	1000000.00
6	test@gmail.com	$2a$10$7QHB1oxHsfiMTAyPj5zvTOiSIeLLbXnQi.c.lVCyzL.G1V2lYk1Ri	test	test	\N	\N	\N	actif	2026-05-19 19:36:00.578242	400000.00
\.


--
-- TOC entry 5000 (class 0 OID 25160)
-- Dependencies: 222
-- Data for Name: utilisateurs_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utilisateurs_roles (id, utilisateur_id, role_id) FROM stdin;
10	1	3
11	2	1
12	5	2
13	6	1
\.


--
-- TOC entry 5024 (class 0 OID 0)
-- Dependencies: 225
-- Name: demandes_conges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.demandes_conges_id_seq', 4, true);


--
-- TOC entry 5025 (class 0 OID 0)
-- Dependencies: 229
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 21, true);


--
-- TOC entry 5026 (class 0 OID 0)
-- Dependencies: 231
-- Name: paie_employes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paie_employes_id_seq', 5, true);


--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 217
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);


--
-- TOC entry 5028 (class 0 OID 0)
-- Dependencies: 227
-- Name: solde_conges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solde_conges_id_seq', 8, true);


--
-- TOC entry 5029 (class 0 OID 0)
-- Dependencies: 223
-- Name: types_conges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.types_conges_id_seq', 3, true);


--
-- TOC entry 5030 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- TOC entry 5031 (class 0 OID 0)
-- Dependencies: 221
-- Name: utilisateurs_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utilisateurs_roles_id_seq', 13, true);


--
-- TOC entry 4823 (class 2606 OID 25198)
-- Name: demandes_conges demandes_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_pkey PRIMARY KEY (id);


--
-- TOC entry 4834 (class 2606 OID 25246)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4837 (class 2606 OID 25268)
-- Name: paie_employes paie_employes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paie_employes
    ADD CONSTRAINT paie_employes_pkey PRIMARY KEY (id);


--
-- TOC entry 4839 (class 2606 OID 25270)
-- Name: paie_employes paie_employes_utilisateur_id_mois_annee_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paie_employes
    ADD CONSTRAINT paie_employes_utilisateur_id_mois_annee_key UNIQUE (utilisateur_id, mois, annee);


--
-- TOC entry 4807 (class 2606 OID 25140)
-- Name: roles roles_nom_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nom_key UNIQUE (nom);


--
-- TOC entry 4809 (class 2606 OID 25138)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4829 (class 2606 OID 25223)
-- Name: solde_conges solde_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_pkey PRIMARY KEY (id);


--
-- TOC entry 4831 (class 2606 OID 25225)
-- Name: solde_conges solde_conges_utilisateur_id_annee_type_conge_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_utilisateur_id_annee_type_conge_id_key UNIQUE (utilisateur_id, annee, type_conge_id);


--
-- TOC entry 4819 (class 2606 OID 25186)
-- Name: types_conges types_conges_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_conges
    ADD CONSTRAINT types_conges_code_key UNIQUE (code);


--
-- TOC entry 4821 (class 2606 OID 25184)
-- Name: types_conges types_conges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.types_conges
    ADD CONSTRAINT types_conges_pkey PRIMARY KEY (id);


--
-- TOC entry 4811 (class 2606 OID 25153)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4813 (class 2606 OID 25151)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4815 (class 2606 OID 25165)
-- Name: utilisateurs_roles utilisateurs_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 4817 (class 2606 OID 25167)
-- Name: utilisateurs_roles utilisateurs_roles_utilisateur_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_utilisateur_id_role_id_key UNIQUE (utilisateur_id, role_id);


--
-- TOC entry 4824 (class 1259 OID 25278)
-- Name: idx_dc_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dc_dates ON public.demandes_conges USING btree (date_debut, date_fin);


--
-- TOC entry 4825 (class 1259 OID 25277)
-- Name: idx_dc_statut; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dc_statut ON public.demandes_conges USING btree (statut);


--
-- TOC entry 4826 (class 1259 OID 25276)
-- Name: idx_dc_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dc_utilisateur ON public.demandes_conges USING btree (utilisateur_id);


--
-- TOC entry 4832 (class 1259 OID 25279)
-- Name: idx_notif_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_utilisateur ON public.notifications USING btree (utilisateur_id, est_lu);


--
-- TOC entry 4835 (class 1259 OID 25280)
-- Name: idx_paie_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_paie_utilisateur ON public.paie_employes USING btree (utilisateur_id);


--
-- TOC entry 4827 (class 1259 OID 25281)
-- Name: idx_solde_utilisateur; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_solde_utilisateur ON public.solde_conges USING btree (utilisateur_id, annee);


--
-- TOC entry 4843 (class 2606 OID 25209)
-- Name: demandes_conges demandes_conges_approbateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_approbateur_id_fkey FOREIGN KEY (approbateur_id) REFERENCES public.users(id);


--
-- TOC entry 4844 (class 2606 OID 25204)
-- Name: demandes_conges demandes_conges_type_conge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_type_conge_id_fkey FOREIGN KEY (type_conge_id) REFERENCES public.types_conges(id);


--
-- TOC entry 4845 (class 2606 OID 25199)
-- Name: demandes_conges demandes_conges_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demandes_conges
    ADD CONSTRAINT demandes_conges_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id);


--
-- TOC entry 4848 (class 2606 OID 25247)
-- Name: notifications notifications_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4849 (class 2606 OID 25271)
-- Name: paie_employes paie_employes_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paie_employes
    ADD CONSTRAINT paie_employes_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4846 (class 2606 OID 25231)
-- Name: solde_conges solde_conges_type_conge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_type_conge_id_fkey FOREIGN KEY (type_conge_id) REFERENCES public.types_conges(id);


--
-- TOC entry 4847 (class 2606 OID 25226)
-- Name: solde_conges solde_conges_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solde_conges
    ADD CONSTRAINT solde_conges_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4840 (class 2606 OID 25154)
-- Name: users users_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4841 (class 2606 OID 25173)
-- Name: utilisateurs_roles utilisateurs_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 4842 (class 2606 OID 25168)
-- Name: utilisateurs_roles utilisateurs_roles_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs_roles
    ADD CONSTRAINT utilisateurs_roles_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-05-22 11:18:56

--
-- PostgreSQL database dump complete
--

\unrestrict JC6Fh7huqGuLB7OXmRHsOmZB2wkd3Ie5oD7TWvhLGGLbIOhwRDjuwVWQxL3heXG

