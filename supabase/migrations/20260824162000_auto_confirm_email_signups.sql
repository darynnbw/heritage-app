create function private.confirm_email_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

create trigger on_auth_user_auto_confirm
  before insert on auth.users
  for each row execute function private.confirm_email_on_signup();
