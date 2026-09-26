"""
python -m server                          # run the app
python -m server import NAME FRAMES [JSON]   # import an old JPEGImages (+ json) folder
"""
import argparse

from . import config


def main():
    parser = argparse.ArgumentParser(prog='python -m server')
    parser.add_argument('--host', default=config.HOST)
    parser.add_argument('--port', type=int, default=config.PORT)
    sub = parser.add_subparsers(dest='cmd')
    imp = sub.add_parser('import', help='create a project from an existing frames folder')
    imp.add_argument('name')
    imp.add_argument('frames_dir')
    imp.add_argument('annotations_dir', nargs='?')
    args = parser.parse_args()

    if args.cmd == 'import':
        from .store import import_folder
        p = import_folder(args.name, args.frames_dir, args.annotations_dir)
        print(f'Imported {len(p.frame_names())} frames into {p.root}')
    else:
        from .app import serve
        serve(args.host, args.port)


if __name__ == '__main__':
    main()
