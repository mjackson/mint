prefix = /usr/local
DEST = $(prefix)/bin/mint
DEPS = vendor/markdown-js vendor/Mu vendor/optparse-js

.PHONY: init install uninstall

init:
	@for dir in $(DEPS); do \
	  if [ ! -d $$dir ]; then \
	    git submodule update --init; \
	    break; \
	  fi \
	done

install: init
	ln -sf $(shell pwd)/bin/mint $(DEST)

uninstall: $(DEST)
	unlink $(DEST)
