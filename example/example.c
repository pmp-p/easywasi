#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef unsigned char rand_type;
rand_type my_rand() {
  char buff[sizeof(rand_type)];
  for (size_t i = 0 ; i < sizeof(rand_type) ; ++i) {
    buff[i] = (char) rand();
  }
  return *(rand_type *) buff;
}

int print_file(char* filename) {
  FILE *file_ptr;
  char ch;
  file_ptr = fopen(filename, "r");
  if (NULL == file_ptr) {
    fprintf(stderr, "file can't be opened \n");
    return 1;
  }
  printf("CONTENTS OF %s:\n", filename);
  fflush(stdout);
  while ((ch = fgetc(file_ptr)) != EOF) {
    printf("%c", ch);
    fflush(stdout);
  }
  fclose(file_ptr);
  return 0;
}

int main(int argc, char *argv[]) {
  printf("hello. argv works: %d\n", argc);
  for (int i=0;i<argc;i++) {
    printf("  %d: %s\n", i, argv[i]);
    fflush(stdout);
  }

  printf("env works:\n");
  const char* COOL = getenv("COOL");
  printf("  COOL=%s\n", COOL);

  printf("stdout works.\n");
  fflush(stdout);
  fprintf(stderr, "stderr works.\n");

  time_t rawtime;
  time ( &rawtime );
  printf ( "time works: %s", ctime(&rawtime));
  fflush(stdout);

  srand(time(NULL));
  printf("random works: %hhu\n", my_rand());
  fflush(stdout);

  // I can read files from zip
  // print_file("/mnt/zip/cyber.txt");

  return 0;
}