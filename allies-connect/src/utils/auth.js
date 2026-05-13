export const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.user_id || user?.id;
  return userId ? { "x-user-id": userId } : {};
};
