export const handleAuthError = (error, navigate) => {
  // navigate: (path) => void (pass window.location.replace or a router navigate)
  console.error('Authentication error:', error);

  const message = (error && error.message) || '';
  if (message.toLowerCase().includes('redirect')) {
    navigate('/auth/error?type=redirect');
  } else if (message.toLowerCase().includes('email')) {
    navigate('/auth/error?type=email');
  } else {
    navigate('/auth/error');
  }
};
