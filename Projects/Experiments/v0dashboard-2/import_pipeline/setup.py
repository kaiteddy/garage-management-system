from setuptools import setup, find_packages

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='import_pipeline',
    version='0.1.0',
    description='Data import pipeline for the application',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='Your Name',
    author_email='your.email@example.com',
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    install_requires=[
        'pandas>=1.3.0',
        'psycopg2-binary>=2.9.0',
        'pyyaml>=6.0',
        'python-dotenv>=0.19.0',
        'tqdm>=4.62.0',
    ],
    python_requires='>=3.8',
    entry_points={
        'console_scripts': [
            'run-imports=import_pipeline.scripts.run_imports:main',
        ],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
    ],
)
