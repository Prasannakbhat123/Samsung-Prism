import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer = () => {
  return (
    <footer className=" text-blue-900 py-3 mt-40">
      <Container>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item xs={12} sm={6} className="text-center sm:text-left">
            <h3 className="font-bold text-2xl">
              ImageSegmentation
            </h3>
            <Typography variant="body2" className="text-blue-900 mt-1">
              A place to remove whatever you want from your pictures in a single click.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} className="text-center sm:text-right">
            <div className="flex justify-center sm:justify-end mb-2">
              <IconButton color="inherit" href="https://facebook.com" aria-label="Facebook">
                <FacebookIcon />
              </IconButton>
              <IconButton color="inherit" href="https://twitter.com" aria-label="Twitter">
                <TwitterIcon />
              </IconButton>
              <IconButton color="inherit" href="https://instagram.com" aria-label="Instagram">
                <InstagramIcon />
              </IconButton>
              <IconButton color="inherit" href="https://linkedin.com" aria-label="LinkedIn">
                <LinkedInIcon />
              </IconButton>
            </div>
            <Typography variant="body2" className="text-blue-900">
              &copy; {new Date().getFullYear()} ImageSegmentation. All rights reserved.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </footer>
  );
};

export default Footer;
