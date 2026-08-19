-- Prompt dédié à la structure / mise en page du mémoire (ordre des sections, format des titres...),
-- séparé du prompt système général, pour que tous les mémoires générés pour un même corps de
-- métier suivent la même structure.

alter table memoire_company_config
  add column if not exists structure_prompt text not null default '';
