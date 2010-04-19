prefix = /usr/local
DEPS = vendor/markdown-js vendor/Mu vendor/optparse-js
DEST = $(prefix)/bin/mint

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
