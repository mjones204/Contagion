--
-- PostgreSQL database dump
--

-- Dumped from database version 10.14 (Ubuntu 10.14-1.pgdg16.04+1)
-- Dumped by pg_dump version 10.15 (Ubuntu 10.15-0ubuntu0.18.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: contagion; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE contagion WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';


ALTER DATABASE contagion OWNER TO postgres;

\connect contagion

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: approved_players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approved_players (
);


ALTER TABLE public.approved_players OWNER TO postgres;

--
-- Name: master_games_table; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_games_table (
    game_id character(36) NOT NULL,
    "timestamp" character varying(23) NOT NULL,
    player_one_id character(36) NOT NULL,
    player_two_id character(36) NOT NULL,
    initial_infections character varying(74) NOT NULL,
    token_removal_flag character varying(5),
    p1_topology_id integer NOT NULL,
    p1_layout_id integer NOT NULL,
    p2_topology_id integer NOT NULL,
    p2_layout_id integer NOT NULL
);


ALTER TABLE public.master_games_table OWNER TO postgres;

--
-- Name: mturk_completion_table; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mturk_completion_table (
    "timestamp" character varying(23) NOT NULL,
    player_id character(36) NOT NULL,
    completion_code character(36) NOT NULL
);


ALTER TABLE public.mturk_completion_table OWNER TO postgres;

--
-- Name: player_actions_table; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_actions_table (
    game_id character(36) NOT NULL,
    round_number integer NOT NULL,
    flipped_nodes character varying(139),
    p1_moves integer,
    p2_moves integer,
    p1_time integer,
    p2_time integer,
    p1_nodes character varying(139),
    p2_nodes character varying(139)
);


ALTER TABLE public.player_actions_table OWNER TO postgres;

--
-- Name: player_clicks_table; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_clicks_table (
    game_id character(36),
    player_id integer,
    node_id integer,
    action character(1),
    "timestamp" integer,
    round_number integer NOT NULL
);


ALTER TABLE public.player_clicks_table OWNER TO postgres;

--
-- Name: master_games_table master_games_table_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_games_table
    ADD CONSTRAINT master_games_table_pkey PRIMARY KEY (game_id);


--
-- Name: player_actions_table player_actions_table_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_actions_table
    ADD CONSTRAINT player_actions_table_pkey PRIMARY KEY (game_id, round_number);


--
-- Name: player_actions_table player_actions_table_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_actions_table
    ADD CONSTRAINT player_actions_table_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.master_games_table(game_id) ON DELETE CASCADE;


--
-- Name: player_clicks_table player_clicks_table_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_clicks_table
    ADD CONSTRAINT player_clicks_table_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.master_games_table(game_id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM postgres;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: LANGUAGE plpgsql; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON LANGUAGE plpgsql TO postgres;


--
-- PostgreSQL database dump complete
--

