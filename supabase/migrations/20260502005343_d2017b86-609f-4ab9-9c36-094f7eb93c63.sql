-- Attach the missing trigger that fires on new auth user creation.
-- The function public.handle_new_user() already exists; it just was never wired up.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();