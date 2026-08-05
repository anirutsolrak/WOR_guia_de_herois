create table if not exists dungeons (
  id bigint primary key,
  index int,
  name_en text not null,
  name_pt text,
  icon_url text
);
create table if not exists classes (
  id bigint primary key,
  title_en text not null,
  title_pt text,
  icon_url text
);
create table if not exists factions (
  id bigint primary key,
  title_en text not null,
  title_pt text,
  icon_url text,
  lord_icon_url text
);
create table if not exists attributes (
  attr_id int primary key,
  name_en text not null,
  name_pt text,
  icon_url text
);
create table if not exists equipment_sets (
  id bigint primary key,
  name_en text,
  name_pt text,
  desc_en text,
  desc_pt text,
  icon_url text
);
create table if not exists equipment_slots (
  id bigint primary key,
  name_en text not null,
  name_pt text,
  icon_url text
);
create table if not exists artifacts (
  id bigint primary key,
  name_en text,
  name_pt text,
  desc_en text,
  desc_pt text,
  icon_url text,
  quality text
);
create table if not exists glossary (
  term_en text primary key,
  term_pt text not null,
  category text
);
