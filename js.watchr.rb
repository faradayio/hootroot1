# Run me with:
#   $ watchr gem.watchr

def gemspec() Dir['*.gemspec'].first end
# --------------------------------------------------
# Rules
# --------------------------------------------------
watch( 'public/javascripts/.*.js' ) { |md| puts md.inspect; build unless md[0] =~ /application.js/ }

# --------------------------------------------------
# Signal Handling
# --------------------------------------------------
Signal.trap('QUIT') { build }       # Ctrl-\
Signal.trap('INT' ) { abort("\n") } # Ctrl-C

# --------------------------------------------------
# Helpers
# --------------------------------------------------
def build
  puts; system "rake js:build"
end
